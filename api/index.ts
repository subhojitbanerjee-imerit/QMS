/**
 * Vercel serverless entry.
 * Imports the pure API app only (no Vite, no @google-cloud gRPC).
 */
import type { IncomingMessage, ServerResponse } from "http";
import app from "../src/server/apiApp";

export const config = {
  runtime: "nodejs",
  maxDuration: 60
};

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // Express is a request listener; Vercel Node runtime invokes this directly.
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
