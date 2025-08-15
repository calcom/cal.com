import sharp from "sharp";

// Maximum allowed size for SVG data (5MB)
const MAX_SVG_SIZE = 5 * 1024 * 1024;

// Content types - copied from Next.js image optimizer
const AVIF = "image/avif";
const WEBP = "image/webp";
const PNG = "image/png";
const JPEG = "image/jpeg";
const JXL = "image/jxl";
const JP2 = "image/jp2";
const HEIC = "image/heic";
const GIF = "image/gif";
const SVG = "image/svg+xml";
const ICO = "image/x-icon";
const ICNS = "image/x-icns";
const TIFF = "image/tiff";
const BMP = "image/bmp";
const PDF = "application/pdf";

/**
 * Converts an SVG image to PNG format
 * @param data Base64 encoded image data
 * @returns Base64 encoded PNG data or a placeholder image if conversion fails
 */
export const convertSvgToPng = async (data: string) => {
  if (data.startsWith("data:image/svg+xml;base64,")) {
    try {
      const base64Data = data.replace(/^data:image\/svg\+xml;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Check if the SVG data exceeds the size limit
      if (buffer.length > MAX_SVG_SIZE) {
        throw new Error("SVG data exceeds maximum allowed size");
      }

      const pngBuffer = await sharp(buffer).png().toBuffer();
      return `data:image/png;base64,${pngBuffer.toString("base64")}`;
    } catch (error) {
      console.error("Error converting SVG to PNG", error);
      // Return a 1x1 transparent PNG as placeholder
      return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    }
  }
  return data;
};

// Copied directly from Next.js image optimizer
let _sharp: typeof sharp | undefined;

function getSharp(concurrency?: number | null) {
  if (_sharp) {
    return _sharp;
  }
  try {
    _sharp = require("sharp");
    if (_sharp && _sharp.concurrency() > 1) {
      // Reducing concurrency should reduce the memory usage too.
      // We more aggressively reduce in dev but also reduce in prod.
      // https://sharp.pixelplumbing.com/api-utility#concurrency
      const divisor = process.env.NODE_ENV === "development" ? 4 : 2;
      _sharp.concurrency(concurrency ?? Math.floor(Math.max(_sharp.concurrency() / divisor, 1)));
    }
  } catch (e) {
    const error = e as { code?: string };
    if (error && error.code === "MODULE_NOT_FOUND") {
      throw new Error("Module `sharp` not found. Please run `npm install sharp` to install it.");
    }
    throw e;
  }
  return _sharp;
}

// Copied directly from Next.js image optimizer
export async function detectContentType(buffer: Buffer): Promise<string | null> {
  if ([0xff, 0xd8, 0xff].every((b, i) => buffer[i] === b)) {
    return JPEG;
  }
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => buffer[i] === b)) {
    return PNG;
  }
  if ([0x47, 0x49, 0x46, 0x38].every((b, i) => buffer[i] === b)) {
    return GIF;
  }
  if ([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50].every((b, i) => !b || buffer[i] === b)) {
    return WEBP;
  }
  if ([0x3c, 0x3f, 0x78, 0x6d, 0x6c].every((b, i) => buffer[i] === b)) {
    return SVG;
  }
  if ([0x3c, 0x73, 0x76, 0x67].every((b, i) => buffer[i] === b)) {
    return SVG;
  }
  if ([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66].every((b, i) => !b || buffer[i] === b)) {
    return AVIF;
  }
  if ([0x00, 0x00, 0x01, 0x00].every((b, i) => buffer[i] === b)) {
    return ICO;
  }
  if ([0x69, 0x63, 0x6e, 0x73].every((b, i) => buffer[i] === b)) {
    return ICNS;
  }
  if ([0x49, 0x49, 0x2a, 0x00].every((b, i) => buffer[i] === b)) {
    return TIFF;
  }
  if ([0x42, 0x4d].every((b, i) => buffer[i] === b)) {
    return BMP;
  }
  if ([0xff, 0x0a].every((b, i) => buffer[i] === b)) {
    return JXL;
  }
  if (
    [0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20, 0x0d, 0x0a, 0x87, 0x0a].every((b, i) => buffer[i] === b)
  ) {
    return JXL;
  }
  if ([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63].every((b, i) => !b || buffer[i] === b)) {
    return HEIC;
  }
  if ([0x25, 0x50, 0x44, 0x46, 0x2d].every((b, i) => buffer[i] === b)) {
    return PDF;
  }
  if (
    [0x00, 0x00, 0x00, 0x0c, 0x6a, 0x50, 0x20, 0x20, 0x0d, 0x0a, 0x87, 0x0a].every((b, i) => buffer[i] === b)
  ) {
    return JP2;
  }
  const sharpInstance = getSharp(null);
  if (!sharpInstance) return null;
  const meta = await sharpInstance(buffer)
    .metadata()
    .catch((_) => null);
  switch (meta == null ? void 0 : meta.format) {
    case "avif":
      return AVIF;
    case "webp":
      return WEBP;
    case "png":
      return PNG;
    case "jpeg":
    case "jpg":
      return JPEG;
    case "gif":
      return GIF;
    case "svg":
      return SVG;
    case "jxl":
      return JXL;
    case "jp2":
      return JP2;
    case "tiff":
    case "tif":
      return TIFF;
    case "pdf":
      return PDF;
    case undefined:
    default:
      return null;
  }
}

// Copied directly from Next.js image optimizer
export async function optimizeImage({
  buffer,
  contentType,
  quality,
  width,
  height,
  concurrency,
  limitInputPixels,
  sequentialRead,
  timeoutInSeconds,
}: {
  buffer: Buffer;
  contentType: string;
  quality: number;
  width: number;
  height?: number;
  concurrency?: number;
  limitInputPixels?: number | boolean;
  sequentialRead?: boolean;
  timeoutInSeconds?: number;
}): Promise<Buffer> {
  const sharpInstance = getSharp(concurrency);
  if (!sharpInstance) throw new Error("Sharp is not available");
  const transformer = sharpInstance(buffer, {
    limitInputPixels,
    sequentialRead: sequentialRead ?? undefined,
  })
    .timeout({
      seconds: timeoutInSeconds ?? 7,
    })
    .rotate();
  if (height) {
    transformer.resize(width, height);
  } else {
    transformer.resize(width, undefined, {
      withoutEnlargement: true,
    });
  }
  if (contentType === AVIF) {
    transformer.avif({
      quality: Math.max(quality - 20, 1),
      effort: 3,
    });
  } else if (contentType === WEBP) {
    transformer.webp({
      quality,
    });
  } else if (contentType === PNG) {
    transformer.png({
      quality,
    });
  } else if (contentType === JPEG) {
    transformer.jpeg({
      quality,
      mozjpeg: true,
    });
  }
  const optimizedBuffer = await transformer.toBuffer();
  return optimizedBuffer;
}
