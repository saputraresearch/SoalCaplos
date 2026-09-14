import fs from "fs";
import path from "path";

const LOG_FILE_PATH = path.join(process.cwd(), "app_errors.log");

export function logServerError(route: string, message: string, error?: unknown, metadata?: Record<string, unknown>) {
  try {
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorMsg = error instanceof Error ? error.message : String(error || message);

    const logEntry = `
--------------------------------------------------------------------------------
[${new Date().toISOString()}] [SERVER_ERROR] [Route: ${route}]
Message: ${message || errorMsg}
${errorStack ? `Stack Trace:\n${errorStack}\n` : ""}${metadata ? `Metadata: ${JSON.stringify(metadata, null, 2)}\n` : ""}--------------------------------------------------------------------------------
`;

    fs.appendFileSync(LOG_FILE_PATH, logEntry, "utf8");
  } catch (err) {
    console.error("Failed to append to app_errors.log from server:", err);
  }
}
