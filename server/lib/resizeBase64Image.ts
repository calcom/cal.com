import jimp from "jimp";

export async function resizeBase64Image(
  base64Str: string,
  opts?: {
    maxSize?: number;
  }
) {
  const mimeMatch = base64Str.match(/^data:(\w+\/\w+);/);
  const mimetype = mimeMatch?.[1];
  if (!mimetype) {
    throw new Error(`Could not distinguish mimetype ${mimetype}`);
  }
  const buffer = Buffer.from(base64Str.replace(/^data:image\/\w+;base64,/, ""), "base64");

  const {
    // 96px is the height of the image on https://cal.com/peer
    maxSize = 96 * 4,
  } = opts ?? {};
  const image = await jimp.read(buffer);
  if (image.getHeight() !== image.getHeight()) {
    // this could be handled later
    throw new Error("Image is not a square");
  }
  const currentSize = Math.max(image.getWidth(), image.getHeight());
  if (currentSize > maxSize) {
    image.resize(jimp.AUTO, maxSize);
  }
  console.log({ mimetype });
  const newBuffer = await image.getBufferAsync(mimetype);

  return `data:${mimetype};base64,${newBuffer.toString("base64")}`;
}
