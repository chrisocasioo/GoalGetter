import app from "./app";
import { logger } from "./lib/logger";

const REQUIRED_REVENUECAT_VARS = [
  "REVENUECAT_WEBHOOK_SECRET",
  "REVENUECAT_PROJECT_ID",
  "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
  "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
] as const;

for (const key of REQUIRED_REVENUECAT_VARS) {
  if (!process.env[key]) {
    logger.warn({ key }, `RevenueCat env var not set — subscription features may not work correctly`);
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
