import type { IncomingMessage, ServerResponse } from "http";
import { handleGeminiRoute } from "../../src/server/geminiHandlers";

export const config = { runtime: "nodejs", maxDuration: 60 };

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  return handleGeminiRoute("coaching", req, res);
}
