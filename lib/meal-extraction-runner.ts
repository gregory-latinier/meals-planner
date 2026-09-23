import {
  fetchNextExtractionJob,
  getAiSettings,
  getMealForExtraction,
  markJobFailed,
  markJobSuccess,
} from "@/lib/meal-library-db";
import { extractMealIngredients } from "@/lib/meal-extraction-provider";
import * as dns from "node:dns";
import * as http from "node:http";
import * as https from "node:https";
import { isIP } from "node:net";

let draining = false;

const URL_FETCH_TIMEOUT_MS = 8000;
const URL_FETCH_MAX_BYTES = 500_000;

let dnsLookupForRecipeRequests: typeof dns.lookup = dns.lookup;
let httpRequestForRecipeRequests: typeof http.request = http.request;
let httpsRequestForRecipeRequests: typeof https.request = https.request;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
  "metadata.azure.internal",
  "169.254.169.254",
  "169.254.170.2",
  "100.100.100.200",
]);

function isPrivateOrLocalIpv4(hostname: string): boolean {
  const octets = hostname.split(".").map((value) => Number.parseInt(value, 10));

  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return false;
  }

  const [a, b] = octets;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

function isPrivateOrLocalIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  if (normalized === "::" || normalized === "::1") {
    return true;
  }

  const firstHextet = normalized.split(":", 1)[0];
  const firstHextetValue = Number.parseInt(firstHextet, 16);

  if (
    Number.isInteger(firstHextetValue) &&
    firstHextetValue >= 0xfe80 &&
    firstHextetValue <= 0xfebf
  ) {
    return true;
  }

  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  if (normalized.startsWith("::ffff:")) {
    return isPrivateOrLocalIpv4(normalized.slice("::ffff:".length));
  }

  return false;
}

function isBlockedRecipeHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1").replace(/\.$/, "");

  if (!normalized) {
    return true;
  }

  if (BLOCKED_HOSTNAMES.has(normalized) || normalized.endsWith(".localhost")) {
    return true;
  }

  const ipVersion = isIP(normalized);

  if (ipVersion === 4) {
    return isPrivateOrLocalIpv4(normalized);
  }

  if (ipVersion === 6) {
    return isPrivateOrLocalIpv6(normalized);
  }

  return false;
}

function isLiteralIpHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  return isIP(normalized) !== 0;
}

function isSafeHttpUrl(value: string | null): value is string {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    return !isBlockedRecipeHostname(parsed.hostname);
  } catch {
    return false;
  }
}

function createRecipeLookupCallback() {
  let resolvedOnce: dns.LookupAddress[] | null = null;

  return (
    hostname: string,
    options: dns.LookupOneOptions | dns.LookupAllOptions,
    callback: (
      error: NodeJS.ErrnoException | null,
      address: string | dns.LookupAddress[],
      family?: number,
    ) => void,
  ): void => {
    const normalizedHostname = hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
    const lookupOptions = typeof options === "number" ? { family: options } : options;

    if (isLiteralIpHostname(normalizedHostname)) {
      const family = isIP(normalizedHostname);

      if (isBlockedRecipeHostname(normalizedHostname)) {
        callback(
          Object.assign(new Error("Recipe URL hostname resolved to a blocked private or local address."), {
            code: "EHOSTUNREACH",
          }),
          "",
        );
        return;
      }

      callback(null, normalizedHostname, family);
      return;
    }

    const finishWithResolvedAddresses = (resolvedAddresses: dns.LookupAddress[]): void => {
      const allowedAddresses = resolvedAddresses.filter(
        (resolvedAddress) => !isBlockedRecipeHostname(resolvedAddress.address),
      );

      if (allowedAddresses.length === 0) {
        callback(
          Object.assign(new Error("Recipe URL DNS lookup resolved only blocked private or local addresses."), {
            code: "EHOSTUNREACH",
          }),
          "",
        );
        return;
      }

      const requestedFamily = typeof lookupOptions.family === "number" ? lookupOptions.family : 0;
      const familyFilteredAddresses =
        requestedFamily === 4 || requestedFamily === 6
          ? allowedAddresses.filter((resolvedAddress) => resolvedAddress.family === requestedFamily)
          : allowedAddresses;

      if (familyFilteredAddresses.length === 0) {
        callback(
          Object.assign(
            new Error(
              `Recipe URL DNS lookup did not return an allowed IPv${requestedFamily} address for this connection.`,
            ),
            {
              code: "EHOSTUNREACH",
            },
          ),
          "",
        );
        return;
      }

      if (lookupOptions.all) {
        callback(null, familyFilteredAddresses);
        return;
      }

      const selectedAddress = familyFilteredAddresses[0];
      callback(null, selectedAddress.address, selectedAddress.family);
    };

    if (resolvedOnce) {
      finishWithResolvedAddresses(resolvedOnce);
      return;
    }

    dnsLookupForRecipeRequests(normalizedHostname, { all: true, verbatim: true }, (error, resolvedAddresses) => {
      if (error) {
        callback(error, "");
        return;
      }

      resolvedOnce = resolvedAddresses;
      finishWithResolvedAddresses(resolvedAddresses);
    });
  };
}

async function requestRecipeUrl(url: URL, signal: AbortSignal): Promise<http.IncomingMessage> {
  const request = url.protocol === "https:" ? httpsRequestForRecipeRequests : httpRequestForRecipeRequests;
  const lookup = createRecipeLookupCallback();

  return await new Promise<http.IncomingMessage>((resolve, reject) => {
    const outgoingRequest = request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port.length > 0 ? Number.parseInt(url.port, 10) : undefined,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        lookup,
        headers: {
          "user-agent": "meals-planner/1.0 (+recipe-extraction)",
          accept: "text/html,text/plain;q=0.9,*/*;q=0.1",
        },
      },
      (response) => {
        resolve(response);
      },
    );

    outgoingRequest.on("error", (error) => {
      reject(error);
    });

    const onAbort = (): void => {
      outgoingRequest.destroy(new Error("Recipe URL request timed out."));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener("abort", onAbort, { once: true });

    outgoingRequest.once("close", () => {
      signal.removeEventListener("abort", onAbort);
    });

    outgoingRequest.end();
  });
}

async function readIncomingMessageTextWithLimit(response: http.IncomingMessage, signal: AbortSignal): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    response.on("data", (chunk: Buffer | string) => {
      const chunkBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

      totalBytes += chunkBuffer.byteLength;

      if (totalBytes > URL_FETCH_MAX_BYTES) {
        response.destroy(new Error("Recipe URL content exceeded the safe processing size limit."));
        return;
      }

      chunks.push(chunkBuffer);
    });

    response.once("error", (error) => {
      reject(error);
    });

    response.once("aborted", () => {
      reject(new Error("Recipe URL request was aborted before response completion."));
    });

    signal.addEventListener(
      "abort",
      () => {
        response.destroy(new Error("Recipe URL request timed out."));
      },
      { once: true },
    );

    response.once("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
  });
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function readResponseTextWithLimit(response: Response, controller: AbortController): Promise<string> {
  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      totalBytes += value.byteLength;

      if (totalBytes > URL_FETCH_MAX_BYTES) {
        controller.abort();
        throw new Error("Recipe URL content exceeded the safe processing size limit.");
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function fetchRecipeTextFromUrl(url: string): Promise<string> {
  const parsedUrl = new URL(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);

  try {
    const response = await requestRecipeUrl(parsedUrl, controller.signal);
    const statusCode = response.statusCode ?? 0;

    if (statusCode >= 300 && statusCode < 400) {
      throw new Error("Recipe URL redirected. Redirects are disabled for SSRF safety.");
    }

    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`Recipe URL returned HTTP ${statusCode}.`);
    }

    const contentTypeHeader = response.headers["content-type"];
    const contentType = typeof contentTypeHeader === "string" ? contentTypeHeader.toLowerCase() : "";

    if (!contentType.includes("text/html") && !contentType.includes("text/plain") && contentType.length > 0) {
      throw new Error("Recipe URL did not return text content.");
    }

    const contentLengthHeader = response.headers["content-length"];
    const declaredLengthRaw = typeof contentLengthHeader === "string" ? contentLengthHeader : "";
    const declaredLength = Number.parseInt(declaredLengthRaw, 10);

    if (Number.isFinite(declaredLength) && declaredLength > URL_FETCH_MAX_BYTES) {
      throw new Error("Recipe URL content is too large to process safely.");
    }

    const body = await readIncomingMessageTextWithLimit(response, controller.signal);

    const normalizedText = contentType.includes("text/html") ? stripHtmlToText(body) : body.trim();

    if (!normalizedText) {
      throw new Error("Recipe URL did not contain readable recipe text.");
    }

    return normalizedText;
  } finally {
    clearTimeout(timeout);
  }
}

function asErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Extraction failed unexpectedly. Please retry extraction.";
}

async function processSingleJob(): Promise<boolean> {
  const nextJob = await fetchNextExtractionJob();

  if (!nextJob) {
    return false;
  }

  const meal = await getMealForExtraction(nextJob.mealId);

  if (!meal) {
    await markJobFailed(nextJob.jobId, nextJob.mealId, "Meal not found for extraction job.");
    return true;
  }

  const settings = await getAiSettings();

  if (!settings.geminiApiToken.trim()) {
    await markJobFailed(
      nextJob.jobId,
      nextJob.mealId,
      "Gemini API token is not configured. Open /admin/ai and save a valid token.",
    );
    return true;
  }

  try {
    let recipeText = meal.recipe;

    if (isSafeHttpUrl(meal.url)) {
      try {
        recipeText = await fetchRecipeTextFromUrl(meal.url);
      } catch (error) {
        console.warn("[meal-extraction] URL recipe fetch failed; falling back to saved recipe text.", {
          mealId: meal.id,
          url: meal.url,
          error: asErrorMessage(error),
        });
      }
    }

    const ingredients = await extractMealIngredients({
      provider: "gemini",
      apiToken: settings.geminiApiToken,
      model: settings.activeModel,
      mealName: meal.name,
      recipe: recipeText,
      url: meal.url,
    });

    await markJobSuccess(nextJob.jobId, nextJob.mealId, ingredients);
  } catch (error) {
    await markJobFailed(nextJob.jobId, nextJob.mealId, asErrorMessage(error));
  }

  return true;
}

async function drainQueue(): Promise<void> {
  if (draining) {
    return;
  }

  draining = true;

  try {
    while (await processSingleJob()) {
      // Continue draining pending jobs in FIFO order.
    }
  } finally {
    draining = false;
  }
}

export function triggerExtractionRunner(): void {
  setTimeout(() => {
    void drainQueue().catch((error) => {
      console.error("[meal-extraction] Queue processing failed.", error);
    });
  }, 0);
}

export const __testables = {
  asErrorMessage,
  isLiteralIpHostname,
  isBlockedRecipeHostname,
  isSafeHttpUrl,
  createRecipeLookupCallback,
  setNetworkOverridesForTests(overrides: {
    dnsLookup?: typeof dns.lookup;
    httpRequest?: typeof http.request;
    httpsRequest?: typeof https.request;
  }): void {
    dnsLookupForRecipeRequests = overrides.dnsLookup ?? dnsLookupForRecipeRequests;
    httpRequestForRecipeRequests = overrides.httpRequest ?? httpRequestForRecipeRequests;
    httpsRequestForRecipeRequests = overrides.httpsRequest ?? httpsRequestForRecipeRequests;
  },
  resetNetworkOverridesForTests(): void {
    dnsLookupForRecipeRequests = dns.lookup;
    httpRequestForRecipeRequests = http.request;
    httpsRequestForRecipeRequests = https.request;
  },
  readResponseTextWithLimit,
  stripHtmlToText,
  fetchRecipeTextFromUrl,
};
