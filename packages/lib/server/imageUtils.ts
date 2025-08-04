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
