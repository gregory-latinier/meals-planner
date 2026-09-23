import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as dns from "node:dns";
import { EventEmitter } from "node:events";
import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import type { ClientRequest, RequestOptions } from "node:http";
import * as http from "node:http";
import * as https from "node:https";

const fetchNextExtractionJobMock = vi.fn();
const getMealForExtractionMock = vi.fn();
const getAiSettingsMock = vi.fn();
const markJobFailedMock = vi.fn();
const markJobSuccessMock = vi.fn();
const extractMealIngredientsMock = vi.fn();

vi.mock("@/lib/meal-library-db", () => ({
  fetchNextExtractionJob: fetchNextExtractionJobMock,
  getMealForExtraction: getMealForExtractionMock,
  getAiSettings: getAiSettingsMock,
  markJobFailed: markJobFailedMock,
  markJobSuccess: markJobSuccessMock,
}));

vi.mock("@/lib/meal-extraction-provider", () => ({
  extractMealIngredients: extractMealIngredientsMock,
}));

type LookupAddress = { address: string; family: 4 | 6 };

type HttpsMockConfig = {
  statusCode?: number;
  headers?: Record<string, string | string[] | undefined>;
  body?: string;
  chunkSize?: number;
  requestError?: Error;
};

function mockDnsLookup(addresses: LookupAddress[]) {
  const calls: Array<{ hostname: string; options: dns.LookupOptions | number | undefined }> = [];

  const lookup = ((
    hostname: string,
    optionsOrCallback:
      | dns.LookupOptions
      | number
      | ((error: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void),
    maybeCallback?: (
      error: NodeJS.ErrnoException | null,
      address: string | dns.LookupAddress[],
      family?: number,
    ) => void,
  ) => {
    calls.push({ hostname, options: typeof optionsOrCallback === "function" ? undefined : optionsOrCallback });

    const normalizedOptions = typeof optionsOrCallback === "function" ? {} : optionsOrCallback;
    const normalizedCallback = typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback;

    if (!normalizedCallback) {
      throw new Error("DNS lookup callback is required in test mock.");
    }

    if (typeof hostname !== "string") {
      normalizedCallback(Object.assign(new Error("Invalid hostname type"), { code: "EINVAL" }), "", 0);
      return undefined as never;
    }

    const lookupOptions = typeof normalizedOptions === "number" ? { family: normalizedOptions } : normalizedOptions;

    if (lookupOptions.all) {
      normalizedCallback(null, addresses, 0);
      return undefined as never;
    }

    const family = typeof lookupOptions.family === "number" ? lookupOptions.family : 0;
    const firstMatch =
      family === 4 || family === 6 ? addresses.find((address) => address.family === family) : addresses[0];

    if (!firstMatch) {
      normalizedCallback(Object.assign(new Error("No matching DNS records"), { code: "ENOTFOUND" }), "", 0);
      return undefined as never;
    }

    normalizedCallback(null, firstMatch.address, firstMatch.family);
    return undefined as never;
  }) as unknown as typeof dns.lookup;

  return { lookup, calls };
}

function mockHttpsRequest(config: HttpsMockConfig = {}) {
  const calls: RequestOptions[] = [];

  const request = ((
    urlOrOptions: string | URL | RequestOptions,
    optionsOrCallback?: RequestOptions | ((response: IncomingMessage) => void),
    maybeCallback?: (response: IncomingMessage) => void,
  ) => {
    const request = new EventEmitter() as unknown as ClientRequest;
    let responseDestroyed = false;

    const response = new EventEmitter() as unknown as IncomingMessage;
    (response as unknown as { statusCode?: number }).statusCode = config.statusCode ?? 200;
    (response as unknown as { headers: IncomingHttpHeaders }).headers = {
      "content-type": "text/plain; charset=utf-8",
      ...(config.headers ?? {}),
    };
    (response as unknown as { destroy: (error?: Error) => void }).destroy = (error?: Error): void => {
      responseDestroyed = true;

      if (error) {
        response.emit("error", error);
      }
    };

    (request as unknown as { destroy: (error?: Error) => void }).destroy = (error?: Error): void => {
      if (error) {
        request.emit("error", error);
      }

      request.emit("close");
    };

    (request as unknown as { end: () => void }).end = (): void => {
      const requestOptions: RequestOptions = (() => {
        if (typeof urlOrOptions === "string" || urlOrOptions instanceof URL) {
          if (typeof optionsOrCallback === "function") {
            return {};
          }

          return optionsOrCallback ?? {};
        }

        return urlOrOptions;
      })();
      calls.push(requestOptions);
      const callback =
        typeof optionsOrCallback === "function"
          ? optionsOrCallback
          : typeof maybeCallback === "function"
            ? maybeCallback
            : undefined;

      const finishWithLookupResult = (lookupError: NodeJS.ErrnoException | null): void => {
        if (lookupError) {
          request.emit("error", lookupError);
          request.emit("close");
          return;
        }

        if (config.requestError) {
          request.emit("error", config.requestError);
          request.emit("close");
          return;
        }

        callback?.(response);

        setTimeout(() => {
          const body = config.body ?? "";
          const chunkSize = config.chunkSize ?? Math.max(body.length, 1);

          for (let index = 0; index < body.length; index += chunkSize) {
            if (responseDestroyed) {
              break;
            }

            response.emit("data", Buffer.from(body.slice(index, Math.min(index + chunkSize, body.length))));
          }

          if (!responseDestroyed) {
            response.emit("end");
          }

          request.emit("close");
        }, 0);
      };

      const lookup = requestOptions.lookup;

      if (!lookup) {
        finishWithLookupResult(null);
        return;
      }

      const hostname = requestOptions.hostname ?? "";
      const family = typeof requestOptions.family === "number" ? requestOptions.family : 0;

      lookup(hostname, { family, all: false, hints: 0 }, (lookupError) => {
        finishWithLookupResult(lookupError);
      });
    };

    return request;
  }) as typeof https.request;

  return { request, calls };
}

describe("meal extraction runner", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setNetworkOverridesForModule(options: {
    dnsLookup?: typeof dns.lookup;
    httpsRequest?: typeof https.request;
  }) {
    return import("@/lib/meal-extraction-runner").then((module) => {
      module.__testables.setNetworkOverridesForTests({
        dnsLookup: options.dnsLookup,
        httpRequest: http.request,
        httpsRequest: options.httpsRequest,
      });

      return module;
    });
  }

  it("fails queued job gracefully when token is missing", async () => {
    fetchNextExtractionJobMock.mockResolvedValueOnce({ jobId: "job-1", mealId: "meal-1" });
    fetchNextExtractionJobMock.mockResolvedValueOnce(null);
    getMealForExtractionMock.mockResolvedValue({
      id: "meal-1",
      name: "Soup",
      recipe: "Water",
      url: null,
      photoUrl: null,
      extractionStatus: "running",
      extractionError: null,
      extractedIngredients: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    getAiSettingsMock.mockResolvedValue({
      geminiApiToken: "",
      models: ["gemini-1.5-flash"],
      activeModel: "gemini-1.5-flash",
    });

    const module = await import("@/lib/meal-extraction-runner");
    module.triggerExtractionRunner();
    await vi.runAllTimersAsync();

    expect(markJobFailedMock).toHaveBeenCalledWith(
      "job-1",
      "meal-1",
      expect.stringMatching(/token is not configured/i),
    );
    expect(markJobSuccessMock).not.toHaveBeenCalled();
    expect(extractMealIngredientsMock).not.toHaveBeenCalled();
  });

  it("marks job success on provider success", async () => {
    fetchNextExtractionJobMock.mockResolvedValueOnce({ jobId: "job-2", mealId: "meal-2" });
    fetchNextExtractionJobMock.mockResolvedValueOnce(null);
    getMealForExtractionMock.mockResolvedValue({
      id: "meal-2",
      name: "Pasta",
      recipe: "Pasta and sauce",
      url: null,
      photoUrl: null,
      extractionStatus: "running",
      extractionError: null,
      extractedIngredients: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    getAiSettingsMock.mockResolvedValue({
      geminiApiToken: "token",
      models: ["gemini-1.5-flash"],
      activeModel: "gemini-1.5-flash",
    });
    extractMealIngredientsMock.mockResolvedValue([{ name: "pasta", amountPerServing: "100g" }]);

    const module = await import("@/lib/meal-extraction-runner");
    module.triggerExtractionRunner();
    await vi.runAllTimersAsync();

    expect(markJobSuccessMock).toHaveBeenCalledWith("job-2", "meal-2", [{ name: "pasta", amountPerServing: "100g" }]);
    expect(markJobFailedMock).not.toHaveBeenCalled();
  });

  it("attempts URL-first recipe extraction before provider call", async () => {
    fetchNextExtractionJobMock.mockResolvedValueOnce({ jobId: "job-3", mealId: "meal-3" });
    fetchNextExtractionJobMock.mockResolvedValueOnce(null);
    getMealForExtractionMock.mockResolvedValue({
      id: "meal-3",
      name: "Curry",
      recipe: "fallback recipe text",
      url: "https://recipes.example.com/curry",
      photoUrl: null,
      extractionStatus: "running",
      extractionError: null,
      extractedIngredients: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    getAiSettingsMock.mockResolvedValue({
      geminiApiToken: "token",
      models: ["gemini-1.5-flash"],
      activeModel: "gemini-1.5-flash",
    });
    extractMealIngredientsMock.mockResolvedValue([{ name: "curry powder" }]);

    const dnsLookupMock = mockDnsLookup([{ address: "93.184.216.34", family: 4 }]);
    const httpsRequestMock = mockHttpsRequest({
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-length": "512",
      },
      body: "<html><body><h1>Curry</h1><p>onion garlic ginger</p></body></html>",
      chunkSize: 16,
    });

    const module = await setNetworkOverridesForModule({
      dnsLookup: dnsLookupMock.lookup,
      httpsRequest: httpsRequestMock.request,
    });
    module.triggerExtractionRunner();
    await vi.runAllTimersAsync();
    module.__testables.resetNetworkOverridesForTests();

    expect(dnsLookupMock.calls.some((call) => call.hostname === "recipes.example.com")).toBe(true);
    expect(httpsRequestMock.calls).toHaveLength(1);
    expect(extractMealIngredientsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipe: expect.stringContaining("onion garlic ginger"),
      }),
    );
    expect(markJobSuccessMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to stored recipe text when URL extraction fails", async () => {
    fetchNextExtractionJobMock.mockResolvedValueOnce({ jobId: "job-4", mealId: "meal-4" });
    fetchNextExtractionJobMock.mockResolvedValueOnce(null);
    getMealForExtractionMock.mockResolvedValue({
      id: "meal-4",
      name: "Stew",
      recipe: "beef carrot potato",
      url: "https://recipes.example.com/stew",
      photoUrl: null,
      extractionStatus: "running",
      extractionError: null,
      extractedIngredients: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    getAiSettingsMock.mockResolvedValue({
      geminiApiToken: "token",
      models: ["gemini-1.5-flash"],
      activeModel: "gemini-1.5-flash",
    });
    extractMealIngredientsMock.mockResolvedValue([{ name: "beef" }]);

    const module = await setNetworkOverridesForModule({
      dnsLookup: mockDnsLookup([{ address: "93.184.216.34", family: 4 }]).lookup,
      httpsRequest: mockHttpsRequest({ requestError: new Error("timeout") }).request,
    });
    module.triggerExtractionRunner();
    await vi.runAllTimersAsync();
    module.__testables.resetNetworkOverridesForTests();

    expect(extractMealIngredientsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipe: "beef carrot potato",
      }),
    );
    expect(markJobSuccessMock).toHaveBeenCalledTimes(1);
    expect(markJobFailedMock).not.toHaveBeenCalled();
  });

  it("falls back to stored recipe text when DNS hostname resolves only to private addresses", async () => {
    fetchNextExtractionJobMock.mockResolvedValueOnce({ jobId: "job-4b", mealId: "meal-4b" });
    fetchNextExtractionJobMock.mockResolvedValueOnce(null);
    getMealForExtractionMock.mockResolvedValue({
      id: "meal-4b",
      name: "Stew",
      recipe: "beef carrot potato",
      url: "https://private-recipes.example.com/stew",
      photoUrl: null,
      extractionStatus: "running",
      extractionError: null,
      extractedIngredients: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    getAiSettingsMock.mockResolvedValue({
      geminiApiToken: "token",
      models: ["gemini-1.5-flash"],
      activeModel: "gemini-1.5-flash",
    });
    extractMealIngredientsMock.mockResolvedValue([{ name: "beef" }]);

    const dnsLookupMock = mockDnsLookup([{ address: "10.0.0.8", family: 4 }]);
    const httpsRequestMock = mockHttpsRequest();

    const module = await setNetworkOverridesForModule({
      dnsLookup: dnsLookupMock.lookup,
      httpsRequest: httpsRequestMock.request,
    });
    module.triggerExtractionRunner();
    await vi.runAllTimersAsync();
    module.__testables.resetNetworkOverridesForTests();

    expect(dnsLookupMock.calls.some((call) => call.hostname === "private-recipes.example.com")).toBe(true);
    expect(httpsRequestMock.calls).toHaveLength(1);
    expect(extractMealIngredientsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipe: "beef carrot potato",
      }),
    );
    expect(markJobSuccessMock).toHaveBeenCalledTimes(1);
    expect(markJobFailedMock).not.toHaveBeenCalled();
  });

  it("rejects unsafe URL protocols and local/private hosts", async () => {
    const module = await import("@/lib/meal-extraction-runner");

    expect(module.__testables.isSafeHttpUrl("https://recipes.example.com/pasta")).toBe(true);

    expect(module.__testables.isSafeHttpUrl("ftp://recipes.example.com/pasta")).toBe(false);
    expect(module.__testables.isSafeHttpUrl("file:///etc/passwd")).toBe(false);
    expect(module.__testables.isSafeHttpUrl("javascript:alert(1)")).toBe(false);

    expect(module.__testables.isSafeHttpUrl("http://localhost:3000/recipe")).toBe(false);
    expect(module.__testables.isSafeHttpUrl("http://127.0.0.1/recipe")).toBe(false);
    expect(module.__testables.isSafeHttpUrl("http://10.0.0.2/recipe")).toBe(false);
    expect(module.__testables.isSafeHttpUrl("http://172.16.1.2/recipe")).toBe(false);
    expect(module.__testables.isSafeHttpUrl("http://192.168.1.2/recipe")).toBe(false);
    expect(module.__testables.isSafeHttpUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(module.__testables.isSafeHttpUrl("http://metadata.google.internal/computeMetadata/v1")).toBe(false);
    expect(module.__testables.isSafeHttpUrl("http://[::1]/recipe")).toBe(false);
    expect(module.__testables.isSafeHttpUrl("http://[fe80::1]/recipe")).toBe(false);
    expect(module.__testables.isSafeHttpUrl("http://[fe90::1]/recipe")).toBe(false);
    expect(module.__testables.isSafeHttpUrl("http://[fd00::1]/recipe")).toBe(false);
    expect(module.__testables.isSafeHttpUrl("https://93.184.216.34/pasta")).toBe(true);
  });

  it("does not fetch unsafe URLs and uses stored recipe text", async () => {
    fetchNextExtractionJobMock.mockResolvedValueOnce({ jobId: "job-5", mealId: "meal-5" });
    fetchNextExtractionJobMock.mockResolvedValueOnce(null);
    getMealForExtractionMock.mockResolvedValue({
      id: "meal-5",
      name: "Chili",
      recipe: "beans tomatoes chili powder",
      url: "http://127.0.0.1:8080/recipe",
      photoUrl: null,
      extractionStatus: "running",
      extractionError: null,
      extractedIngredients: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    getAiSettingsMock.mockResolvedValue({
      geminiApiToken: "token",
      models: ["gemini-1.5-flash"],
      activeModel: "gemini-1.5-flash",
    });
    extractMealIngredientsMock.mockResolvedValue([{ name: "beans" }]);

    const httpsRequestMock = mockHttpsRequest();

    const module = await setNetworkOverridesForModule({ httpsRequest: httpsRequestMock.request });
    module.triggerExtractionRunner();
    await vi.runAllTimersAsync();
    module.__testables.resetNetworkOverridesForTests();

    expect(httpsRequestMock.calls).toHaveLength(0);
    expect(extractMealIngredientsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipe: "beans tomatoes chili powder",
      }),
    );
    expect(markJobSuccessMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to stored recipe text when URL returns redirect", async () => {
    fetchNextExtractionJobMock.mockResolvedValueOnce({ jobId: "job-6", mealId: "meal-6" });
    fetchNextExtractionJobMock.mockResolvedValueOnce(null);
    getMealForExtractionMock.mockResolvedValue({
      id: "meal-6",
      name: "Bread",
      recipe: "flour water yeast",
      url: "https://93.184.216.34/bread",
      photoUrl: null,
      extractionStatus: "running",
      extractionError: null,
      extractedIngredients: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    getAiSettingsMock.mockResolvedValue({
      geminiApiToken: "token",
      models: ["gemini-1.5-flash"],
      activeModel: "gemini-1.5-flash",
    });
    extractMealIngredientsMock.mockResolvedValue([{ name: "flour" }]);

    const httpsRequestMock = mockHttpsRequest({
        statusCode: 302,
        headers: {
          location: "http://169.254.169.254/latest/meta-data",
        },
      });
    const dnsLookupMock = mockDnsLookup([{ address: "93.184.216.34", family: 4 }]);

    const module = await setNetworkOverridesForModule({
      dnsLookup: dnsLookupMock.lookup,
      httpsRequest: httpsRequestMock.request,
    });
    module.triggerExtractionRunner();
    await vi.runAllTimersAsync();
    module.__testables.resetNetworkOverridesForTests();

    expect(httpsRequestMock.calls).toHaveLength(1);
    expect(extractMealIngredientsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipe: "flour water yeast",
      }),
    );
    expect(markJobSuccessMock).toHaveBeenCalledTimes(1);
    expect(markJobFailedMock).not.toHaveBeenCalled();
  });

  it("falls back to stored recipe text when streamed response exceeds size cap without content-length", async () => {
    fetchNextExtractionJobMock.mockResolvedValueOnce({ jobId: "job-7", mealId: "meal-7" });
    fetchNextExtractionJobMock.mockResolvedValueOnce(null);
    getMealForExtractionMock.mockResolvedValue({
      id: "meal-7",
      name: "Soup",
      recipe: "stock onion garlic",
      url: "https://93.184.216.34/large-soup",
      photoUrl: null,
      extractionStatus: "running",
      extractionError: null,
      extractedIngredients: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    getAiSettingsMock.mockResolvedValue({
      geminiApiToken: "token",
      models: ["gemini-1.5-flash"],
      activeModel: "gemini-1.5-flash",
    });
    extractMealIngredientsMock.mockResolvedValue([{ name: "onion" }]);

    const oversizedText = "x".repeat(300_000) + "y".repeat(300_000);
    const httpsRequestMock = mockHttpsRequest({
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
        body: oversizedText,
        chunkSize: 300_000,
      });
    const dnsLookupMock = mockDnsLookup([{ address: "93.184.216.34", family: 4 }]);

    const module = await setNetworkOverridesForModule({
      dnsLookup: dnsLookupMock.lookup,
      httpsRequest: httpsRequestMock.request,
    });
    module.triggerExtractionRunner();
    await vi.runAllTimersAsync();
    module.__testables.resetNetworkOverridesForTests();

    expect(httpsRequestMock.calls).toHaveLength(1);
    expect(extractMealIngredientsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipe: "stock onion garlic",
      }),
    );
    expect(markJobSuccessMock).toHaveBeenCalledTimes(1);
    expect(markJobFailedMock).not.toHaveBeenCalled();
  });
});
