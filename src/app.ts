/**
 * Express application setup
 */

import express, { Express } from "express";
import cors from "cors";
import path from "path";
import orderRoutes from "./routes/order.routes";
import { errorHandler } from "./middlewares/error-handler.middleware";

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  // CORS middleware - allow all origins in development
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true,
    })
  );

  // JSON body parser middleware
  app.use(express.json());

  // Serve static files from public directory
  app.use(express.static(path.join(__dirname, "../public")));

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  // API routes
  app.use("/", orderRoutes);

  // Error handler middleware (must be last)
  app.use(errorHandler);

  return app;
}
