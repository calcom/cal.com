const MAX_IMAGE_SIZE = 512;

export type Area = {
  width: number;
  height: number;
  x: number;
  y: number;
};

const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous"); // needed to avoid cross-origin issues on CodeSandbox
    image.src = url;
  });

export async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Context is null, this should never happen.");

  const maxSize = Math.max(image.naturalWidth, image.naturalHeight);
  const resizeRatio = MAX_IMAGE_SIZE / maxSize < 1 ? Math.max(MAX_IMAGE_SIZE / maxSize, 0.75) : 1;
  // huh, what? - Having this turned off actually improves image quality as otherwise anti-aliasing is applied
  // this reduces the quality of the image overall because it anti-aliases the existing, copied image; blur results
  ctx.imageSmoothingEnabled = false;
  // pixelCrop is always 1:1 - width = height
  canvas.width = canvas.height = Math.min(maxSize * resizeRatio, pixelCrop.width);

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // on very low ratios, the quality of the resize becomes awful. For this reason the resizeRatio is limited to 0.75
  if (resizeRatio <= 0.75) {
    // With a smaller image, thus improved ratio. Keep doing this until the resizeRatio > 0.75.
    return getCroppedImg(canvas.toDataURL("image/png"), {
      width: canvas.width,
      height: canvas.height,
      x: 0,
      y: 0,
    });
  }

  return canvas.toDataURL("image/png");
}
