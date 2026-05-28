import app from "./app";
import { logger } from "./lib/logger";

const REQUIRED_REVENUECAT_SERVER_VARS = [
  "REVENUECAT_WEBHOOK_SECRET",
  "REVENUECAT_PROJECT_ID",
] as const;

for (const key of REQUIRED_REVENUECAT_SERVER_VARS) {
  if (!process.env[key]) {
    logger.warn({ key }, `RevenueCat server-side env var not set — subscription webhook and entitlement grant features will not work correctly`);
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
