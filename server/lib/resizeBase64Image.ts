import jimp from "jimp";

export async function resizeBase64Image(
  base64Str: string,
  opts?: {
    maxSize?: number;
  }
) {
  const buffer = Buffer.from(base64Str.replace(/^data:image\/\w+;base64,/, ""), "base64");

  const { maxSize = 96 * 4 } = opts ?? {};
  const image = await jimp.read(buffer);

  const mime = image.getMIME();

  const currentSize = Math.max(image.getWidth(), image.getHeight());

  if (currentSize > maxSize) {
    const biggest = image.getWidth() > image.getHeight() ? "width" : "height";
    if (biggest === "width") {
      image.resize(jimp.AUTO, maxSize);
    } else {
      image.resize(maxSize, jimp.AUTO);
    }
  }
  const newBuffer = await image.getBufferAsync(image.getMIME());

  return `data:${mime};base64,${newBuffer.toString("base64")}`;
}
