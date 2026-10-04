// ── Env validation must run before anything else ─────────────────────────────
import "./env.js";

import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { appRouter } from "./routers.js";
import { handleImageUpload } from "./upload-handler.js";
import { staffSessionTokenFromRequest } from "./staff-sessions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);

  // CORS: restricted in production, open in dev
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "production" ? allowedOrigin || false : true,
      credentials: true,
    })
  );

  // Rate Limiting - General API
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: "Too many requests, please try again later.",
      retryAfter: "15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate Limiting - Strict for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per windowMs
    message: {
      error: "Too many authentication attempts, please try again later.",
      retryAfter: "15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate Limiting - Upload endpoint
  const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 uploads per minute
    message: {
      error: "Too many upload requests, please try again later.",
      retryAfter: "1 minute",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply general rate limiting to all API routes
  app.use("/api", generalLimiter);

  // Apply stricter rate limiting to auth-related routes
  app.use("/api/trpc/adminAuth", authLimiter);
  app.use("/api/trpc/staffAuth", authLimiter);
  app.use("/api/trpc/users", authLimiter);
  app.use("/api/trpc/suppliers", authLimiter);
  app.use("/api/trpc/distributors", authLimiter);
  app.use("/api/trpc/distributorsAdmin", authLimiter);

  // Apply upload rate limiting
  app.use("/api/upload", uploadLimiter);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(cookieParser());

  // Serve uploaded images (dev only)
  const uploadsDir = path.resolve(__dirname, "..", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use("/uploads", express.static(uploadsDir));

  // Upload endpoint: admin session required. JPEG, PNG, WebP, GIF — max 5 MB.
  app.post("/api/upload", (req, res) => {
    void handleImageUpload(req, res, uploadsDir);
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: ({ req, res }) => ({
        // Admin: httpOnly cookie (preferred) or header (backward compat for tooling)
        adminToken:
          (req.cookies?.adminSession as string | undefined) ??
          (req.headers["x-admin-token"] as string | undefined),
        // User, supplier, distributor: httpOnly cookies only (Batch 2/3 auth hardening)
        userToken: req.cookies?.userSession as string | undefined,
        supplierToken: req.cookies?.supplierSession as string | undefined,
        distributorToken: req.cookies?.distributorSession as string | undefined,
        staffToken: staffSessionTokenFromRequest(req),
        req,
        res,
      }),
      onError({ path, error }) {
        console.error(`[tRPC error] ${path}:`, error.message, error.cause);
      },
    })
  );

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port =
    process.env.PORT || (process.env.NODE_ENV === "production" ? 3000 : 3001);
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
