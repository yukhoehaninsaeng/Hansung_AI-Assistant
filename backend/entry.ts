import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { createContext } from "../server/_core/context";
import { appRouter } from "../server/routers";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

process.on("uncaughtException", err => {
  console.error("[fatal] uncaughtException", err);
});

process.on("unhandledRejection", reason => {
  console.error("[fatal] unhandledRejection", reason);
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ path, error }) {
      console.error("[tRPC]", path, error);
    },
  })
);

app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[express]", err);
  res.status(500).json({ error: "internal_server_error" });
});

export default app;
