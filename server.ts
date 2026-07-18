/**
 * Local full-stack entrypoint (npm run dev / npm start).
 * API routes live in src/server/apiApp.ts so Vercel never bundles Vite.
 */
import path from "path";
import express from "express";
import dotenv from "dotenv";
import app from "./src/server/apiApp";

dotenv.config();
dotenv.config({ path: ".env.local" });

const PORT = Number(process.env.PORT) || 3000;

export default app;

async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

// Never listen on Vercel — the platform invokes the exported app as a function.
if (!process.env.VERCEL) {
  bootstrap().catch((err) => {
    console.error("Critical error bootstrapping full-stack server:", err);
    process.exitCode = 1;
  });
}
