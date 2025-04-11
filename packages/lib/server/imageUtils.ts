import sharp from "sharp";

/**
 * Converts an SVG image to PNG format
 * @param data Base64 encoded image data
 * @returns Base64 encoded PNG data
 */
export const convertSvgToPng = async (data: string) => {
  if (data.startsWith("data:image/svg+xml;base64,")) {
    const base64Data = data.replace(/^data:image\/svg\+xml;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const pngBuffer = await sharp(buffer).png().toBuffer();
    return `data:image/png;base64,${pngBuffer.toString("base64")}`;
  }
  return data;
};
