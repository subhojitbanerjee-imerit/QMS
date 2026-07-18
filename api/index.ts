import app from "../server.ts";

export default app;

// BigQuery metadata + full-table reads can exceed the default serverless budget.
export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};
