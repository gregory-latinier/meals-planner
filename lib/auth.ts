import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { appendFile, copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type TokenPurpose = "setup" | "reset";

type AuthTokenRecord = {
  purpose: TokenPurpose;
  hash: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
};

type AuthState = {
  initialized: boolean;
  passwordSalt?: string;
  passwordHash?: string;
  setupToken?: AuthTokenRecord;
  resetToken?: AuthTokenRecord;
};

export type AuthConfig = {
  stateFile: string;
  auditLogFile: string;
  setupTokenTtlMs: number;
  resetTokenTtlMs: number;
  minPasswordLength: number;
  setupTokenOutputFile?: string;
};

export type AuthStatus = {
  initialized: boolean;
  setupEnabled: boolean;
};

export type PasswordPolicy = {
  minPasswordLength: number;
};

export type AuthActionResult = {
  ok: boolean;
  error?: string;
};

type LoginResult = AuthActionResult;

type SessionPayload = {
  sub: "admin";
  iat: number;
  exp: number;
  nonce: string;
};

export type SetupTokenBootstrapResult = {
  generated: boolean;
  token?: string;
  expiresAt?: string;
};

type TokenValidationResult = {
  valid: boolean;
  error?: string;
};

type ReadStateResult = {
  state: AuthState;
  locked: boolean;
  source: "primary" | "backup" | "default" | "locked";
};

const DEFAULT_STATE: AuthState = {
  initialized: false,
};

const DEFAULT_AUTH_STATE_FILE = ".data/auth-state.json";
const DEFAULT_AUTH_AUDIT_LOG_FILE = ".data/auth-audit.log";
const STATE_FILE_BACKUP_SUFFIX = ".bak";
const STATE_FILE_TEMP_SUFFIX = ".tmp";

const AUTH_STATE_UNREADABLE_ERROR =
  "Auth state is unreadable or malformed. Restore the auth state file from backup and retry.";

function parsePositiveIntEnv(name: string, fallback: number): number {
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

function parsePositiveIntEnvAsSeconds(name: string, fallbackHours: number): number {
  const hours = parsePositiveIntEnv(name, fallbackHours);
  return hours * 60 * 60;
}

function getAuthConfig(): AuthConfig {
  const setupTokenTtlMinutes = parsePositiveIntEnv("AUTH_SETUP_TOKEN_TTL_MINUTES", 30);
  const resetTokenTtlMinutes = parsePositiveIntEnv("AUTH_RESET_TOKEN_TTL_MINUTES", 15);
  const minPasswordLength = parsePositiveIntEnv("AUTH_MIN_PASSWORD_LENGTH", 12);

  return {
    stateFile: resolve(process.cwd(), process.env.AUTH_STATE_FILE ?? DEFAULT_AUTH_STATE_FILE),
    auditLogFile: resolve(process.cwd(), process.env.AUTH_AUDIT_LOG_FILE ?? DEFAULT_AUTH_AUDIT_LOG_FILE),
    setupTokenTtlMs: setupTokenTtlMinutes * 60 * 1000,
    resetTokenTtlMs: resetTokenTtlMinutes * 60 * 1000,
    minPasswordLength,
    setupTokenOutputFile: process.env.AUTH_SETUP_TOKEN_FILE
      ? resolve(process.cwd(), process.env.AUTH_SETUP_TOKEN_FILE)
      : undefined,
  };
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getSessionSigningKey(salt: string, hash: string): Buffer {
  return createHash("sha256").update(`meals-planner-session:${salt}:${hash}`).digest();
}

function buildSessionToken(salt: string, hash: string): string {
  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds = parsePositiveIntEnvAsSeconds("AUTH_SESSION_TTL_HOURS", 12);
  const payload: SessionPayload = {
    sub: "admin",
    iat: now,
    exp: now + ttlSeconds,
    nonce: randomBytes(12).toString("base64url"),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", getSessionSigningKey(salt, hash)).update(encodedPayload).digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function validateSessionToken(token: string, salt: string, hash: string): boolean {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  let payload: SessionPayload;

  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return false;
  }

  if (payload.sub !== "admin") {
    return false;
  }

  if (!Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = createHmac("sha256", getSessionSigningKey(salt, hash)).update(encodedPayload).digest("base64url");
  const providedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function nowIso(): string {
  return new Date().toISOString();
}

function isExpired(expiresAt: string, now = Date.now()): boolean {
  return new Date(expiresAt).getTime() <= now;
}

function hasUsableToken(record?: AuthTokenRecord): boolean {
  if (!record) {
    return false;
  }

  if (record.usedAt) {
    return false;
  }

  return !isExpired(record.expiresAt);
}

function parseTokenRecord(value: unknown, purpose: TokenPurpose): AuthTokenRecord | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Partial<AuthTokenRecord>;

  if (
    record.purpose !== purpose ||
    typeof record.hash !== "string" ||
    typeof record.createdAt !== "string" ||
    typeof record.expiresAt !== "string"
  ) {
    return undefined;
  }

  if (record.usedAt !== undefined && typeof record.usedAt !== "string") {
    return undefined;
  }

  return {
    purpose,
    hash: record.hash,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    usedAt: record.usedAt,
  };
}

function parseAuthState(value: unknown): AuthState | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const parsed = value as Partial<AuthState>;

  return {
    initialized: parsed.initialized === true,
    passwordSalt: typeof parsed.passwordSalt === "string" ? parsed.passwordSalt : undefined,
    passwordHash: typeof parsed.passwordHash === "string" ? parsed.passwordHash : undefined,
    setupToken: parseTokenRecord(parsed.setupToken, "setup"),
    resetToken: parseTokenRecord(parsed.resetToken, "reset"),
  };
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

function passwordError(password: string, minPasswordLength: number): string | undefined {
  if (password.length < minPasswordLength) {
    return `Password must be at least ${minPasswordLength} characters long.`;
  }

  return undefined;
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const resolvedSalt = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, resolvedSalt, 64).toString("hex");

  return { hash, salt: resolvedSalt };
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  const nextHash = scryptSync(password, salt, 64).toString("hex");

  const hashBuffer = Buffer.from(hash, "hex");
  const nextHashBuffer = Buffer.from(nextHash, "hex");

  if (hashBuffer.length !== nextHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(hashBuffer, nextHashBuffer);
}

class AuthService {
  private mutationLock: Promise<void> = Promise.resolve();

  constructor(private readonly config: AuthConfig) {}

  async getStatus(): Promise<AuthStatus> {
    const stateResult = await this.readState();

    return {
      initialized: stateResult.state.initialized,
      setupEnabled: !stateResult.state.initialized,
    };
  }

  async bootstrapSetupToken(): Promise<SetupTokenBootstrapResult> {
    return this.withMutationLock(async () => {
      const stateResult = await this.readState();
      const state = stateResult.state;

      if (stateResult.locked || state.initialized) {
        return { generated: false };
      }

      if (hasUsableToken(state.setupToken)) {
        return {
          generated: false,
          expiresAt: state.setupToken?.expiresAt,
        };
      }

      const { token, record } = this.createToken("setup", this.config.setupTokenTtlMs);

      state.setupToken = record;

      await this.writeState(state);
      await this.writeAudit("setup_token_generated", { expiresAt: record.expiresAt, source: "startup" });

      if (this.config.setupTokenOutputFile) {
        await this.writeSetupTokenFile(token);
      }

      return {
        generated: true,
        token,
        expiresAt: record.expiresAt,
      };
    });
  }

  async completeSetup(token: string, password: string): Promise<AuthActionResult> {
    const validationError = passwordError(password, this.config.minPasswordLength);

    if (validationError) {
      return { ok: false, error: validationError };
    }

    return this.withMutationLock(async () => {
      const stateResult = await this.readState();
      const state = stateResult.state;

      if (stateResult.locked) {
        await this.writeAudit("setup_failed", { reason: "state_unreadable" });
        return { ok: false, error: AUTH_STATE_UNREADABLE_ERROR };
      }

      if (state.initialized) {
        return { ok: false, error: "Setup is disabled because the system is already initialized." };
      }

      const tokenValidation = this.validateToken(state.setupToken, token);

      if (!tokenValidation.valid) {
        await this.writeAudit("setup_failed", { reason: tokenValidation.error ?? "invalid_token" });
        return { ok: false, error: tokenValidation.error };
      }

      const { hash, salt } = hashPassword(password);

      state.passwordHash = hash;
      state.passwordSalt = salt;
      state.initialized = true;

      if (state.setupToken) {
        state.setupToken.usedAt = nowIso();
      }

      state.resetToken = undefined;

      await this.writeState(state);
      await this.writeAudit("setup_completed", {});

      return { ok: true };
    });
  }

  async generateResetToken(): Promise<{ ok: boolean; token?: string; expiresAt?: string; error?: string }> {
    return this.withMutationLock(async () => {
      const stateResult = await this.readState();
      const state = stateResult.state;

      if (stateResult.locked) {
        return {
          ok: false,
          error: AUTH_STATE_UNREADABLE_ERROR,
        };
      }

      if (!state.initialized) {
        return {
          ok: false,
          error: "Reset token is unavailable until setup is complete.",
        };
      }

      const { token, record } = this.createToken("reset", this.config.resetTokenTtlMs);

      state.resetToken = record;

      await this.writeState(state);
      await this.writeAudit("reset_token_generated", { expiresAt: record.expiresAt, source: "local_command" });

      return {
        ok: true,
        token,
        expiresAt: record.expiresAt,
      };
    });
  }

  async completePasswordReset(token: string, password: string): Promise<AuthActionResult> {
    const validationError = passwordError(password, this.config.minPasswordLength);

    if (validationError) {
      return { ok: false, error: validationError };
    }

    return this.withMutationLock(async () => {
      const stateResult = await this.readState();
      const state = stateResult.state;

      if (stateResult.locked) {
        await this.writeAudit("reset_failed", { reason: "state_unreadable" });
        return { ok: false, error: AUTH_STATE_UNREADABLE_ERROR };
      }

      if (!state.initialized) {
        return { ok: false, error: "Setup is not complete yet. Use /setup first." };
      }

      const tokenValidation = this.validateToken(state.resetToken, token);

      if (!tokenValidation.valid) {
        await this.writeAudit("reset_failed", { reason: tokenValidation.error ?? "invalid_token" });
        return { ok: false, error: tokenValidation.error };
      }

      const { hash, salt } = hashPassword(password);

      state.passwordHash = hash;
      state.passwordSalt = salt;

      if (state.resetToken) {
        state.resetToken.usedAt = nowIso();
      }

      await this.writeState(state);
      await this.writeAudit("reset_completed", {});

      return { ok: true };
    });
  }

  async login(password: string): Promise<LoginResult> {
    const stateResult = await this.readState();
    const state = stateResult.state;

    if (stateResult.locked) {
      return { ok: false, error: AUTH_STATE_UNREADABLE_ERROR };
    }

    if (!state.initialized || !state.passwordHash || !state.passwordSalt) {
      return { ok: false, error: "System setup is not complete. Open /setup to initialize admin access." };
    }

    const passwordIsValid = verifyPassword(password, state.passwordSalt, state.passwordHash);

    if (!passwordIsValid) {
      await this.writeAudit("login_failed", { reason: "invalid_credentials" });
      return { ok: false, error: "Invalid password." };
    }

    await this.writeAudit("login_succeeded", {});

    return { ok: true };
  }

  async createSessionToken(): Promise<string | null> {
    const stateResult = await this.readState();
    const state = stateResult.state;

    if (stateResult.locked || !state.initialized || !state.passwordSalt || !state.passwordHash) {
      return null;
    }

    return buildSessionToken(state.passwordSalt, state.passwordHash);
  }

  async hasValidSession(token: string): Promise<boolean> {
    if (!token.trim()) {
      return false;
    }

    const stateResult = await this.readState();
    const state = stateResult.state;

    if (stateResult.locked || !state.initialized || !state.passwordSalt || !state.passwordHash) {
      return false;
    }

    return validateSessionToken(token, state.passwordSalt, state.passwordHash);
  }

  private createToken(purpose: TokenPurpose, ttlMs: number): { token: string; record: AuthTokenRecord } {
    const token = randomBytes(24).toString("base64url");
    const createdAt = Date.now();

    return {
      token,
      record: {
        purpose,
        hash: tokenHash(token),
        createdAt: new Date(createdAt).toISOString(),
        expiresAt: new Date(createdAt + ttlMs).toISOString(),
      },
    };
  }

  private validateToken(record: AuthTokenRecord | undefined, token: string): TokenValidationResult {
    if (!record) {
      return { valid: false, error: "Token is missing or has already been rotated." };
    }

    if (record.usedAt) {
      return { valid: false, error: "Token has already been used." };
    }

    if (isExpired(record.expiresAt)) {
      return { valid: false, error: "Token has expired. Generate a new token and retry." };
    }

    const providedHash = tokenHash(token);
    const expectedHash = Buffer.from(record.hash, "hex");
    const actualHash = Buffer.from(providedHash, "hex");

    if (expectedHash.length !== actualHash.length || !timingSafeEqual(expectedHash, actualHash)) {
      return { valid: false, error: "Token is invalid." };
    }

    return { valid: true };
  }

  private async readState(): Promise<ReadStateResult> {
    const primary = await this.readStateFile(this.config.stateFile);

    if (primary.state) {
      return {
        state: primary.state,
        locked: false,
        source: "primary",
      };
    }

    const backup = await this.readStateFile(this.getBackupStateFilePath());

    if (backup.state) {
      return {
        state: backup.state,
        locked: false,
        source: "backup",
      };
    }

    if (primary.exists) {
      return {
        state: {
          ...DEFAULT_STATE,
          initialized: true,
        },
        locked: true,
        source: "locked",
      };
    }

    return {
      state: { ...DEFAULT_STATE },
      locked: false,
      source: "default",
    };
  }

  private async readStateFile(filePath: string): Promise<{ state?: AuthState; exists: boolean }> {
    try {
      const content = await readFile(filePath, "utf8");
      const parsed = parseAuthState(JSON.parse(content));

      if (!parsed) {
        return { exists: true };
      }

      return { state: parsed, exists: true };
    } catch (error) {
      if (isMissingFileError(error)) {
        return { exists: false };
      }

      return { exists: true };
    }
  }

  private async writeState(state: AuthState): Promise<void> {
    await mkdir(dirname(this.config.stateFile), { recursive: true });

    const nextState: AuthState = {
      initialized: state.initialized === true,
      passwordSalt: state.passwordSalt,
      passwordHash: state.passwordHash,
      setupToken: state.setupToken,
      resetToken: state.resetToken,
    };

    const tempFilePath = this.getTempStateFilePath();
    await writeFile(tempFilePath, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
    await rename(tempFilePath, this.config.stateFile);
    await copyFile(this.config.stateFile, this.getBackupStateFilePath());
  }

  private async writeAudit(event: string, details: Record<string, unknown>): Promise<void> {
    await mkdir(dirname(this.config.auditLogFile), { recursive: true });

    const entry = JSON.stringify({
      ts: nowIso(),
      event,
      details,
    });

    await appendFile(this.config.auditLogFile, `${entry}\n`, "utf8");
  }

  private async writeSetupTokenFile(token: string): Promise<void> {
    if (!this.config.setupTokenOutputFile) {
      return;
    }

    await mkdir(dirname(this.config.setupTokenOutputFile), { recursive: true });
    await writeFile(this.config.setupTokenOutputFile, `${token}\n`, "utf8");
  }

  private getBackupStateFilePath(): string {
    return `${this.config.stateFile}${STATE_FILE_BACKUP_SUFFIX}`;
  }

  private getTempStateFilePath(): string {
    return `${this.config.stateFile}${STATE_FILE_TEMP_SUFFIX}`;
  }

  private async withMutationLock<T>(operation: () => Promise<T>): Promise<T> {
    const waitForPrevious = this.mutationLock;
    let releaseLock: (() => void) | undefined;

    this.mutationLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    await waitForPrevious;

    try {
      return await operation();
    } finally {
      releaseLock?.();
    }
  }
}

const authService = new AuthService(getAuthConfig());

export async function getAuthStatus(): Promise<AuthStatus> {
  return authService.getStatus();
}

export async function bootstrapSetupToken(): Promise<SetupTokenBootstrapResult> {
  return authService.bootstrapSetupToken();
}

export async function completeSetup(token: string, password: string): Promise<AuthActionResult> {
  return authService.completeSetup(token, password);
}

export async function generateResetToken() {
  return authService.generateResetToken();
}

export async function completePasswordReset(token: string, password: string): Promise<AuthActionResult> {
  return authService.completePasswordReset(token, password);
}

export async function login(password: string): Promise<LoginResult> {
  return authService.login(password);
}

export async function createAuthSessionToken(): Promise<string | null> {
  return authService.createSessionToken();
}

export async function validateAuthSessionToken(token: string): Promise<boolean> {
  return authService.hasValidSession(token);
}

export function getPasswordPolicy(): PasswordPolicy {
  return {
    minPasswordLength: getAuthConfig().minPasswordLength,
  };
}

export function createAuthServiceForTests(config: AuthConfig) {
  return new AuthService(config);
}
