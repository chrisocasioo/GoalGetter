import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { optionalAuth } from "./middlewares/auth";
import { guestSession } from "./middlewares/guestSession";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Identity middlewares — order matters
app.use(optionalAuth);    // 1. Extract Clerk user ID from Bearer token if present
app.use(guestSession);    // 2. Assign server-side guest session if not authenticated

app.use("/api", router);

// Global error handler — must be last, must have 4 args
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  // Never expose internal details (SQL queries, stack traces) to clients
  res.status(500).json({ error: "An unexpected error occurred" });
});

export default app;
