import { createReadStream, existsSync } from "fs";
import { promises as fs } from "fs";
import { IncomingMessage, ServerResponse } from "http";
import { extname, join, normalize } from "path";

const distDir = join(process.cwd(), "dist");

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

const getSafePath = (urlPath: string): string => {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, "");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const resolveFilePath = async (safePath: string): Promise<string> => {
  let candidate = join(distDir, safePath);
  try {
    const stats = await fs.stat(candidate);
    if (stats.isDirectory()) {
      candidate = join(candidate, "index.html");
    }
    return candidate;
  } catch {
    const fallback = join(distDir, "index.html");
    if (existsSync(fallback)) {
      return fallback;
    }
    throw new Error("Dist folder missing. Run `npm run build` before deploying.");
  }
};

const sendFile = (res: ServerResponse, filePath: string) => {
  const ext = extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";
  res.setHeader("Content-Type", contentType);
  res.setHeader(
    "Cache-Control",
    ext === ".html" ? "no-cache, no-store, must-revalidate" : "public, max-age=31536000, immutable"
  );

  const stream = createReadStream(filePath);
  stream.on("error", (error) => {
    console.error("Failed to read file:", error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  });
  stream.pipe(res);
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method && !["GET", "HEAD"].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    res.end("Method Not Allowed");
    return;
  }

  try {
    const urlPath = req.url ?? "/";
    const safePath = getSafePath(urlPath);
    const filePath = await resolveFilePath(safePath);
    sendFile(res, filePath);
  } catch (error) {
    console.error("Server render error:", error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}
