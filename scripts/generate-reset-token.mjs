import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const DEFAULT_AUTH_STATE_FILE = ".data/auth-state.json";
const DEFAULT_AUTH_AUDIT_LOG_FILE = ".data/auth-audit.log";

function parsePositiveIntEnv(name, fallback) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function readState(stateFile) {
  try {
    const content = await readFile(stateFile, "utf8");
    return JSON.parse(content);
  } catch {
    return { initialized: false };
  }
}

async function writeState(stateFile, state) {
  await mkdir(dirname(stateFile), { recursive: true });
  await writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function writeAudit(auditLogFile, event, details) {
  await mkdir(dirname(auditLogFile), { recursive: true });
  await appendFile(
    auditLogFile,
    `${JSON.stringify({ ts: new Date().toISOString(), event, details })}\n`,
    "utf8",
  );
}

async function main() {
  const stateFile = resolve(process.cwd(), process.env.AUTH_STATE_FILE ?? DEFAULT_AUTH_STATE_FILE);
  const auditLogFile = resolve(process.cwd(), process.env.AUTH_AUDIT_LOG_FILE ?? DEFAULT_AUTH_AUDIT_LOG_FILE);
  const resetTokenTtlMinutes = parsePositiveIntEnv("AUTH_RESET_TOKEN_TTL_MINUTES", 15);
  const now = Date.now();

  const state = await readState(stateFile);

  if (!state.initialized) {
    console.error("[auth] Failed to generate reset token: setup is not complete yet.");
    process.exitCode = 1;
    return;
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(now + resetTokenTtlMinutes * 60 * 1000).toISOString();

  state.resetToken = {
    purpose: "reset",
    hash: tokenHash(token),
    createdAt: new Date(now).toISOString(),
    expiresAt,
  };

  await writeState(stateFile, state);
  await writeAudit(auditLogFile, "reset_token_generated", { expiresAt, source: "local_command" });

  console.info("[auth] One-time reset token generated.");
  console.info("[auth] Open /reset and submit this token with your new password.");
  console.info(`[auth] Reset token: ${token}`);
  console.info(`[auth] Expires at: ${expiresAt}`);
}

main().catch((error) => {
  console.error(`[auth] Unexpected error while generating reset token: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
