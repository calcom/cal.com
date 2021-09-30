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

  const { maxSize = 96 * 4 } = opts ?? {};
  const image = await jimp.read(buffer);
  const currentSize = Math.max(image.getWidth(), image.getHeight());

  if (currentSize > maxSize) {
    const biggest = image.getWidth() > image.getHeight() ? "width" : "height";
    if (biggest === "width") {
      image.resize(jimp.AUTO, maxSize);
    } else {
      image.resize(maxSize, jimp.AUTO);
    }
  }
  console.log({ mimetype });
  const newBuffer = await image.getBufferAsync(mimetype);

  return `data:${mimetype};base64,${newBuffer.toString("base64")}`;
}
