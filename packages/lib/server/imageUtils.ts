import sharp from "sharp";

// Maximum allowed size for SVG data (5MB)
const MAX_SVG_SIZE = 5 * 1024 * 1024;

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

/**
 * Resize an image buffer while preserving the original format.
 * Simplified version of Next.js image optimizer's optimizeImage function (https://github.com/vercel/next.js/blob/9436dce61f1a3ff9478261dc2eba47e0527acf3d/packages/next/src/server/image-optimizer.ts#L640).
 * Supports common web image formats (JPEG, PNG, WEBP, AVIF) with format-specific
 * optimization settings. Drops advanced options like limitInputPixels, sequentialRead,
 * and timeout that aren't needed for logo processing. Uses failOnError: false for
 * better robustness with potentially malformed images.
 */
export async function resizeImage(params: {
  buffer: Buffer;
  width: number;
  height?: number;
  quality?: number;
  contentType?: string;
}): Promise<{ buffer: Buffer; contentType: string }> {
  const { buffer, width, height, quality = 100 } = params;
  let { contentType } = params;

  // Auto-detect content type if not provided
  if (!contentType) {
    contentType = (await detectContentType(buffer)) ?? PNG;
  }

  const transformer = sharp(buffer).rotate();

  if (height) {
    transformer.resize(width, height);
  } else {
    transformer.resize(width, undefined, { withoutEnlargement: true });
  }

  // Apply format-specific optimization (preserving original format)
  if (contentType === AVIF) {
    transformer.avif({
      quality: Math.max(quality - 20, 1),
      effort: 3,
    });
  } else if (contentType === WEBP) {
    transformer.webp({ quality });
  } else if (contentType === PNG) {
    transformer.png({ quality });
  } else if (contentType === JPEG) {
    transformer.jpeg({ quality, mozjpeg: true });
  } else {
    // For unknown formats, default to PNG
    transformer.png({ quality });
    contentType = PNG;
  }

  const optimizedBuffer = await transformer.toBuffer();
  return { buffer: optimizedBuffer, contentType };
}