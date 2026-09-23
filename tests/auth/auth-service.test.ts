import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthServiceForTests } from "@/lib/auth";

describe("AuthService token lifecycle", () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), "meals-planner-auth-"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeService(options?: { setupTtlMs?: number; resetTtlMs?: number; minPasswordLength?: number }) {
    return createAuthServiceForTests({
      stateFile: join(workDir, "auth-state.json"),
      auditLogFile: join(workDir, "audit.log"),
      setupTokenTtlMs: options?.setupTtlMs ?? 1000 * 60,
      resetTokenTtlMs: options?.resetTtlMs ?? 1000 * 60,
      minPasswordLength: options?.minPasswordLength ?? 12,
      setupTokenOutputFile: join(workDir, "setup-token.txt"),
    });
  }

  it("generates setup token on bootstrap and reuses until expiry", async () => {
    const service = makeService();

    const first = await service.bootstrapSetupToken();
    expect(first.generated).toBe(true);
    expect(first.token).toBeDefined();

    const second = await service.bootstrapSetupToken();
    expect(second.generated).toBe(false);
    expect(second.expiresAt).toBeDefined();
  });

  it("enforces setup token single-use semantics", async () => {
    const service = makeService({ minPasswordLength: 8 });

    const token = await service.bootstrapSetupToken();

    expect(token.token).toBeDefined();

    const setupResult = await service.completeSetup(token.token!, "strongpass");
    expect(setupResult.ok).toBe(true);

    const reuse = await service.completeSetup(token.token!, "anotherpass");
    expect(reuse.ok).toBe(false);
    expect(reuse.error).toMatch(/already initialized/i);
  });

  it("rejects expired setup tokens", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const service = makeService({ setupTtlMs: 1000, minPasswordLength: 8 });
    const token = await service.bootstrapSetupToken();

    vi.setSystemTime(new Date("2026-01-01T00:00:02.000Z"));

    const result = await service.completeSetup(token.token!, "strongpass");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/expired/i);
  });

  it("resets password with one-time token and invalidates old password", async () => {
    const service = makeService({ minPasswordLength: 8 });
    const setupToken = await service.bootstrapSetupToken();

    await service.completeSetup(setupToken.token!, "oldpassword");

    const resetToken = await service.generateResetToken();
    expect(resetToken.ok).toBe(true);

    const resetResult = await service.completePasswordReset(resetToken.token!, "newpassword");
    expect(resetResult.ok).toBe(true);

    const oldLogin = await service.login("oldpassword");
    expect(oldLogin.ok).toBe(false);

    const newLogin = await service.login("newpassword");
    expect(newLogin.ok).toBe(true);

    const reusedReset = await service.completePasswordReset(resetToken.token!, "againpassword");
    expect(reusedReset.ok).toBe(false);
    expect(reusedReset.error).toMatch(/already been used/i);
  });

  it("writes setup token output file when configured", async () => {
    const service = makeService();
    const result = await service.bootstrapSetupToken();

    expect(result.token).toBeDefined();

    const tokenFileContent = await readFile(join(workDir, "setup-token.txt"), "utf8");
    expect(tokenFileContent.trim()).toBe(result.token);
  });

  it("writes audit events for setup and reset lifecycle", async () => {
    const service = makeService({ minPasswordLength: 8 });

    const setupToken = await service.bootstrapSetupToken();
    await service.completeSetup(setupToken.token!, "strongpass");

    const resetToken = await service.generateResetToken();
    await service.completePasswordReset(resetToken.token!, "anotherpass");

    const audit = await readFile(join(workDir, "audit.log"), "utf8");

    expect(audit).toContain("setup_token_generated");
    expect(audit).toContain("setup_completed");
    expect(audit).toContain("reset_token_generated");
    expect(audit).toContain("reset_completed");
  });

  it("rejects expired reset tokens", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const service = makeService({ resetTtlMs: 1000, minPasswordLength: 8 });
    const setupToken = await service.bootstrapSetupToken();

    await service.completeSetup(setupToken.token!, "strongpass");

    const resetToken = await service.generateResetToken();
    expect(resetToken.ok).toBe(true);

    vi.setSystemTime(new Date("2026-01-01T00:00:02.000Z"));

    const result = await service.completePasswordReset(resetToken.token!, "anotherpass");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/expired/i);
  });

  it("fails closed when auth state is malformed/unreadable after initialization", async () => {
    const stateFile = join(workDir, "auth-state.json");
    const service = createAuthServiceForTests({
      stateFile,
      auditLogFile: join(workDir, "audit.log"),
      setupTokenTtlMs: 1000 * 60,
      resetTokenTtlMs: 1000 * 60,
      minPasswordLength: 8,
      setupTokenOutputFile: join(workDir, "setup-token.txt"),
    });

    const setupToken = await service.bootstrapSetupToken();
    await service.completeSetup(setupToken.token!, "strongpass");

    await writeFile(stateFile, "{malformed json", "utf8");
    await rm(`${stateFile}.bak`);

    const status = await service.getStatus();
    expect(status.initialized).toBe(true);
    expect(status.setupEnabled).toBe(false);

    const setupAttempt = await service.completeSetup(setupToken.token!, "anotherpass");
    expect(setupAttempt.ok).toBe(false);
    expect(setupAttempt.error).toMatch(/unreadable|malformed/i);

    const loginAttempt = await service.login("strongpass");
    expect(loginAttempt.ok).toBe(false);
    expect(loginAttempt.error).toMatch(/unreadable|malformed/i);
  });

  it("regenerates setup token after expiry without restart via bootstrap", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const previousEnv = {
      AUTH_STATE_FILE: process.env.AUTH_STATE_FILE,
      AUTH_AUDIT_LOG_FILE: process.env.AUTH_AUDIT_LOG_FILE,
      AUTH_SETUP_TOKEN_FILE: process.env.AUTH_SETUP_TOKEN_FILE,
      AUTH_SETUP_TOKEN_TTL_MINUTES: process.env.AUTH_SETUP_TOKEN_TTL_MINUTES,
    };

    process.env.AUTH_STATE_FILE = join(workDir, "bootstrap-state.json");
    process.env.AUTH_AUDIT_LOG_FILE = join(workDir, "bootstrap-audit.log");
    process.env.AUTH_SETUP_TOKEN_FILE = join(workDir, "bootstrap-token.txt");
    process.env.AUTH_SETUP_TOKEN_TTL_MINUTES = "1";

    try {
      vi.resetModules();
      const startup = await import("@/lib/startup");

      await startup.ensureAuthBootstrap();

      const firstToken = (await readFile(join(workDir, "bootstrap-token.txt"), "utf8")).trim();
      expect(firstToken.length).toBeGreaterThan(0);

      vi.setSystemTime(new Date("2026-01-01T00:02:00.000Z"));

      await startup.ensureAuthBootstrap();

      const secondToken = (await readFile(join(workDir, "bootstrap-token.txt"), "utf8")).trim();
      expect(secondToken.length).toBeGreaterThan(0);
      expect(secondToken).not.toBe(firstToken);
    } finally {
      process.env.AUTH_STATE_FILE = previousEnv.AUTH_STATE_FILE;
      process.env.AUTH_AUDIT_LOG_FILE = previousEnv.AUTH_AUDIT_LOG_FILE;
      process.env.AUTH_SETUP_TOKEN_FILE = previousEnv.AUTH_SETUP_TOKEN_FILE;
      process.env.AUTH_SETUP_TOKEN_TTL_MINUTES = previousEnv.AUTH_SETUP_TOKEN_TTL_MINUTES;
      vi.resetModules();
    }
  });

  it("allows only one successful setup completion under parallel token reuse", async () => {
    const service = makeService({ minPasswordLength: 8 });
    const token = await service.bootstrapSetupToken();

    const [first, second] = await Promise.all([
      service.completeSetup(token.token!, "strongpass"),
      service.completeSetup(token.token!, "strongpass"),
    ]);

    const successes = [first, second].filter((result) => result.ok);
    const failures = [first, second].filter((result) => !result.ok);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
  });

  it("allows only one successful reset completion under parallel token reuse", async () => {
    const service = makeService({ minPasswordLength: 8 });
    const setupToken = await service.bootstrapSetupToken();
    await service.completeSetup(setupToken.token!, "strongpass");

    const resetToken = await service.generateResetToken();
    expect(resetToken.ok).toBe(true);

    const [first, second] = await Promise.all([
      service.completePasswordReset(resetToken.token!, "newpassword"),
      service.completePasswordReset(resetToken.token!, "newpassword"),
    ]);

    const successes = [first, second].filter((result) => result.ok);
    const failures = [first, second].filter((result) => !result.ok);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
  });
});
