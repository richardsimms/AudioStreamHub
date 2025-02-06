import express, { type Request, Response, NextFunction } from "express";
import multer from "multer";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Configure multer to accept any field without restrictions
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: 10 * 1024 * 1024, // 10MB limit for fields
    fileSize: 10 * 1024 * 1024 // 10MB limit for files
  }
}).any();

// Parse JSON payloads with increased limit
app.use(express.json({limit: '10mb'}));

// Parse URL-encoded bodies with increased limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Use multer middleware before routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/email')) {
    upload(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(500).json({ error: 'Upload error', message: err.message });
      }
      next();
    });
  } else {
    next();
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Detailed request logging for debugging
  if (path.startsWith("/api/email")) {
    console.log("Request Headers:", req.headers);
    console.log("Request Body:", req.body);
    console.log("Request Files:", req.files);
    console.log("Request Method:", req.method);
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Express error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();