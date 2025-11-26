"use client";

import { useCallback, useState, useEffect } from "react";
import Cropper from "react-easy-crop";

import checkIfItFallbackImage from "@calcom/lib/checkIfItFallbackImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { ButtonColor } from "../button";
import { Button } from "../button";
import { Dialog, DialogClose, DialogContent, DialogTrigger, DialogFooter } from "../dialog";
import { showToast } from "../toast";
import { useFileReader, createImage, Slider } from "./Common";
import type { FileEvent, Area } from "./Common";

type BannerUploaderProps = {
  id: string;
  buttonMsg: string;
  handleAvatarChange: (imageSrc: string) => void;
  imageSrc?: string;
  target: string;
  triggerButtonColor?: ButtonColor;
  uploadInstruction?: string;
  disabled?: boolean;
  height: number;
  width: number;
};

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
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-52 w-160">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={3}
          onCropChange={setCrop}
          onCropComplete={(croppedArea, croppedAreaPixels) => onCropComplete(croppedAreaPixels)}
          onZoomChange={setZoom}
        />
      </div>
      <Slider
        value={zoom}
        min={1}
        max={3}
        step={0.1}
        label={t("slide_zoom_drag_instructions")}
        changeHandler={handleZoomSliderChange}
      />
    </div>
  );
}

export default function BannerUploader({
  target,
  id,
  buttonMsg,
  handleAvatarChange,
  triggerButtonColor,
  imageSrc,
  uploadInstruction,
  disabled = false,
  height,
  width,
}: BannerUploaderProps) {
  const { t } = useLocale();
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [{ result }, setFile] = useFileReader({
    method: "readAsDataURL",
  });

  const onInputFile = async (e: FileEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) {
      return;
    }

    const limit = 5 * 1000000; // max limit 5mb
    const file = e.target.files[0];

    if (file.size > limit) {
      showToast(t("image_size_limit_exceed"), "error");
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
          croppedAreaPixels,
          height,
          width
        );
        handleAvatarChange(croppedImage);
      } catch (e) {
        console.error(e);
      }
    },
    [result, height, width, handleAvatarChange]
  );

  useEffect(() => {
    const checkDimensions = async () => {
      const image = await createImage(
        result as string /* result is always string when using readAsDataUrl */
      );
      if (image.naturalWidth !== width || image.naturalHeight !== height) {
        showToast(t("org_banner_instructions", { height, width }), "warning");
      }
    };
    if (result) {
      checkDimensions();
    }
  }, [result]);

  return (
    <Dialog
      onOpenChange={(opened) => {
        // unset file on close
        if (!opened) {
          setFile(null);
        }
      }}>
      <DialogTrigger asChild>
        <Button
          color={triggerButtonColor ?? "secondary"}
          type="button"
          disabled={disabled}
          data-testid={`open-upload-${target}-dialog`}
          className="cursor-pointer py-1 text-sm">
          {buttonMsg}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:w-180 sm:max-w-180" title={t("upload_target", { target })}>
        <div className="mb-4">
          <div className="cropper mt-6 flex flex-col items-center justify-center p-8">
            {!result && (
              <div className="bg-cal-muted flex h-60 w-full items-center justify-start">
                {!imageSrc || checkIfItFallbackImage(imageSrc) ? (
                  <p className="text-emphasis w-full text-center text-sm sm:text-xs">
                    {t("no_target", { target })}
                  </p>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="h-full w-full" src={imageSrc} alt={target} />
                )}
              </div>
            )}
            {result && <CropContainer imageSrc={result as string} onCropComplete={setCroppedAreaPixels} />}
            <label
              data-testid="open-upload-image-filechooser"
              className="bg-subtle hover:bg-cal-muted hover:text-emphasis border-subtle text-default mt-8 cursor-pointer rounded-sm border px-3 py-1 text-xs font-medium leading-4 transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-1">
              <input
                onInput={onInputFile}
                type="file"
                name={id}
                placeholder={t("upload_image")}
                className="text-default pointer-events-none absolute mt-4 opacity-0 "
                accept="image/*"
              />
              {t("choose_a_file")}
            </label>
            {uploadInstruction && (
              <p className="text-muted mt-4 text-center text-sm">({uploadInstruction})</p>
            )}
          </div>
        </div>
        <DialogFooter className="relative">
          <DialogClose color="minimal">{t("cancel")}</DialogClose>
          <DialogClose
            data-testid="upload-avatar"
            color="primary"
            onClick={() => showCroppedImage(croppedAreaPixels)}>
            {t("save")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  height: number,
  width: number
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Context is null, this should never happen.");

  // Detect original image format from data URL
  const originalFormat =
    imageSrc.startsWith("data:image/jpeg") || imageSrc.startsWith("data:image/jpg")
      ? "image/jpeg"
      : "image/png";

  canvas.width = width;
  canvas.height = height;

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

  // Use original format with quality setting for JPEG
  return canvas.toDataURL(originalFormat, originalFormat === "image/jpeg" ? 0.6 : undefined);
}
