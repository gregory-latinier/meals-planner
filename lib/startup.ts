import { bootstrapSetupToken } from "@/lib/auth";

let bootstrapPromise: Promise<void> | undefined;

async function runBootstrap(): Promise<void> {
  const result = await bootstrapSetupToken();

  if (!result.generated || !result.token || !result.expiresAt) {
    return;
  }

  console.info("[auth] First-run setup token generated.");
  console.info(`[auth] Setup URL: /setup`);
  console.info(`[auth] Setup token: ${result.token}`);
  console.info(`[auth] Expires at: ${result.expiresAt}`);

  if (process.env.AUTH_SETUP_TOKEN_FILE) {
    console.info(`[auth] Setup token was also written to: ${process.env.AUTH_SETUP_TOKEN_FILE}`);
  }
}

export async function ensureAuthBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrap()
      .finally(() => {
        bootstrapPromise = undefined;
      });
  }

  await bootstrapPromise;
}
