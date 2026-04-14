"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";

import checkIfItFallbackImage from "@calcom/lib/checkIfItFallbackImage";
import { useLocale } from "@calcom/i18n/useLocale";
import { Button, buttonVariants } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@coss/ui/components/dialog";
import { Slider } from "@coss/ui/components/slider";

import type { ButtonColor, ButtonProps } from "../button";
import { toastManager } from "@coss/ui/components/toast";
import { useFileReader, createImage } from "./Common";
import type { FileEvent, Area } from "./Common";
import { cn } from "@coss/ui/lib/utils";

function getTriggerVariant(color?: ButtonColor): "default" | "outline" | "ghost" {
  switch (color) {
    case "primary":
      return "default";
    case "minimal":
      return "ghost";
    case "secondary":
    default:
      return "outline";
  }
}

const MAX_IMAGE_SIZE = 512;

type ImageUploaderProps = {
  id: string;
  buttonMsg: string;
  buttonSize?: ButtonProps["size"];
  handleAvatarChange: (imageSrc: string) => void;
  imageSrc?: string;
  target: string;
  triggerButtonColor?: ButtonColor;
  uploadInstruction?: string;
  disabled?: boolean;
  testId?: string;
};

// This is separate to prevent loading the component until file upload
function CropContainer({
  onCropComplete,
  imageSrc,
}: {
  imageSrc: string;
  onCropComplete: (croppedAreaPixels: Area) => void;
}) {
  const { t } = useLocale();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const handleZoomSliderChange = (value: number) => {
    value < 1 ? setZoom(1) : setZoom(value);
  };

  return (
    <div className="crop-container h-40 max-h-40 w-40 rounded-full">
      <div className="relative h-40 w-40 rounded-full">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onCropComplete={(croppedArea, croppedAreaPixels) => onCropComplete(croppedAreaPixels)}
          onZoomChange={setZoom}
        />
      </div>
      <Slider
        className="mt-2 *:data-[slot=slider-control]:min-w-0!"
        value={[zoom]}
        min={1}
        max={3}
        step={0.1}
        aria-label={t("slide_zoom_drag_instructions")}
        onValueChange={(value) => handleZoomSliderChange(Array.isArray(value) ? value[0] ?? 1 : value)}
      />
    </div>
  );
}

export default function ImageUploader({
  target,
  id,
  buttonMsg,
  handleAvatarChange,
  triggerButtonColor,
  imageSrc,
  uploadInstruction,
  disabled = false,
  testId,
  buttonSize,
}: ImageUploaderProps) {
  const { t } = useLocale();
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [{ result }, setFile] = useFileReader({
    method: "readAsDataURL",
  });

  const onInputFile = (e: FileEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) {
      return;
    }

    const limit = 5 * 1000000; // max limit 5mb
    const file = e.target.files[0];

    if (file.size > limit) {
      toastManager.add({ title: t("image_size_limit_exceed"), type: "error" });
    } else {
      setFile(file);
    }
  };

  const showCroppedImage = useCallback(
    async (croppedAreaPixels: Area | null) => {
      try {
        if (!croppedAreaPixels) return;
        const croppedImage = await getCroppedImg(
          result as string /* result is always string when using readAsDataUrl */,
          croppedAreaPixels
        );
        handleAvatarChange(croppedImage);
      } catch (e) {
        console.error(e);
      }
    },
    [result, handleAvatarChange]
  );

  const triggerVariant = getTriggerVariant(triggerButtonColor ?? "secondary");
  const triggerSize: "xs" | "sm" | "default" | "lg" =
    buttonSize === "xs" ? "xs" : buttonSize === "sm" ? "sm" : buttonSize === "lg" ? "lg" : "default";

  return (
    <Dialog
      onOpenChange={(opened) => {
        if (!opened) {
          setFile(null);
        }
      }}>
      <DialogTrigger
        render={
          <Button
            variant={triggerVariant}
            size={triggerSize}
            disabled={disabled}
            data-testid={testId ? `open-upload-${testId}-dialog` : "open-upload-avatar-dialog"}
            className="cursor-pointer py-1 text-sm"
          />
        }>
        {buttonMsg}
      </DialogTrigger>
      <DialogPopup className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("upload_target", { target })}</DialogTitle>
        </DialogHeader>
        <DialogPanel scrollFade={false} className="mb-4">
          <div className="cropper mt-6 flex flex-col items-center justify-center p-8">
            {!result && (
              <div className="bg-cal-muted flex h-20 max-h-20 w-20 items-center justify-start rounded-full">
                {!imageSrc || checkIfItFallbackImage(imageSrc) ? (
                  <p className="text-emphasis w-full text-center text-sm sm:text-xs">
                    {t("no_target", { target })}
                  </p>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="h-20 w-20 rounded-full" src={imageSrc} alt={target} />
                )}
              </div>
            )}
            {result && <CropContainer imageSrc={result as string} onCropComplete={setCroppedAreaPixels} />}
            <label
              data-testid={testId ? `open-upload-${testId}-filechooser` : "open-upload-image-filechooser"}
              className={cn("mt-8", buttonVariants({ variant: "outline", size: "xs" }))}>
              <input
                onInput={onInputFile}
                type="file"
                name={id}
                placeholder={t("upload_image")}
                className="text-default pointer-events-none absolute mt-4 opacity-0"
                accept="image/*"
              />
              {t("choose_a_file")}
            </label>
            {uploadInstruction && (
              <p className="text-muted mt-4 text-center text-sm">({uploadInstruction})</p>
            )}
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>{t("cancel")}</DialogClose>
          <DialogClose
            render={
              <Button
                variant="default"
                data-testid={testId ? `upload-${testId}` : "upload-avatar"}
                onClick={() => showCroppedImage(croppedAreaPixels)}
              />
            }>
            {t("save")}
          </DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Context is null, this should never happen.");

  // Detect original image format from data URL
  const originalFormat =
    imageSrc.startsWith("data:image/jpeg") || imageSrc.startsWith("data:image/jpg")
      ? "image/jpeg"
      : "image/png";

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
    return getCroppedImg(canvas.toDataURL(originalFormat), {
      width: canvas.width,
      height: canvas.height,
      x: 0,
      y: 0,
    });
  }

  // Use original format with quality setting for JPEG
  return canvas.toDataURL(originalFormat, originalFormat === "image/jpeg" ? 0.9 : undefined);
}
