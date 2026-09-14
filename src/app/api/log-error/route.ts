import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LOG_FILE_PATH = path.join(process.cwd(), "app_errors.log");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, message, stack, url, timestamp, metadata } = body;

    const logEntry = `
--------------------------------------------------------------------------------
[${timestamp || new Date().toISOString()}] [${(type || "ERROR").toUpperCase()}]
URL: ${url || "Unknown"}
Message: ${message}
${stack ? `Stack Trace:\n${stack}\n` : ""}${metadata ? `Metadata: ${JSON.stringify(metadata, null, 2)}\n` : ""}--------------------------------------------------------------------------------
`;

    // Append to app_errors.log
    fs.appendFileSync(LOG_FILE_PATH, logEntry, "utf8");

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Failed to write to app_errors.log:", err);
    return NextResponse.json({ error: "Failed to record log" }, { status: 500 });
  }
}
