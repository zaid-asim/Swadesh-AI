import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import path from "path";

// Load .env first
import { config as dotenvConfig } from "dotenv";
dotenvConfig();

const app = express();

app.use(
  express.json({
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as any).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined;

  const originalResJson = res.json.bind(res);
  res.json = function (bodyJson: unknown) {
    capturedJsonResponse = bodyJson as Record<string, unknown>;
    return originalResJson(bodyJson);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

(async () => {
  if (process.env.DATABASE_URL) {
    try {
      const { db } = await import("./db");
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      if (db) {
        const migrationsFolder =
          process.env.NODE_ENV === "production"
            ? path.join(process.cwd(), "dist", "migrations")
            : path.join(process.cwd(), "migrations");
        log(`Running migrations from ${migrationsFolder}...`);
        await migrate(db, { migrationsFolder });
        log("✅ Migrations completed");
      }
    } catch (error) {
      console.error("⚠ Migration failed (continuing):", error);
    }
  } else {
    log("⚠ DATABASE_URL not set — skipping DB & migrations");
  }

  const server = await registerRoutes(app);

  app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as any).status || (err as any).statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    if (process.env.NODE_ENV === "development") console.error(err);
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(server, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, () => {
    log(`🚀 Swadesh AI on http://localhost:${port}`);
    if (!process.env.DATABASE_URL) log("   ℹ Add DATABASE_URL to .env for memory/auth features.");
    if (!process.env.GEMINI_API_KEY) log("   ⚠ GEMINI_API_KEY missing — AI features disabled.");
  });
})();