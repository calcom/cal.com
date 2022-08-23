import fs from "fs";
import mime from "mime-types";
import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";

/**
 * This endpoint should allow us to access to the private files in the static
 * folder of each individual app in the App Store.
 * @example
 * ```text
 * Requesting: `/api/app-store/zoomvideo/icon.svg` from a public URL should
 * serve us the file located at: `/packages/app-store/zoomvideo/static/icon.svg`
 * ```
 * This will allow us to keep all app-specific static assets in the same directory.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const queryParts = Array.isArray(req.query.static) ? req.query.static : [req.query.static];
  let appPath, fileName;
  if (queryParts[0] === "ee") {
    const appName = queryParts[1];
    if (!appName) {
      return res.status(400).json({ error: true, message: "No app name provided" });
    }
    appPath = path.join("ee", appName);
    fileName = queryParts[2];
  } else {
    [appPath, fileName] = queryParts;
  }

  if (!fileName) {
    return res.status(400).json({ error: true, message: "No file name provided" });
  }
  if (!appPath) {
    return res.status(400).json({ error: true, message: "No app name provided" });
  }
  const fileNameParts = fileName.split(".");
  const { [fileNameParts.length - 1]: fileExtension } = fileNameParts;
  const STATIC_PATH = path.join(process.cwd(), "..", "..", "packages/app-store", appPath, "static", fileName);
  try {
    const imageBuffer = fs.readFileSync(STATIC_PATH);
    const mimeType = mime.lookup(fileExtension);
    if (mimeType) res.setHeader("Content-Type", mimeType);
    res.send(imageBuffer);
  } catch (e) {
    res.status(400).json({ error: true, message: "Resource not found" });
  }
}
