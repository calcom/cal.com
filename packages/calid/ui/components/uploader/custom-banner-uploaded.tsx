"use client";

import React, { useCallback, useState, useEffect } from "react";
import Cropper from "react-easy-crop";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button } from "../button";
import type { ButtonColor } from "../button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog";
import { triggerToast } from "../toast";
import { useFileReader, createImage, Slider, type FileEvent, type Area } from "./common";

type BannerUploaderProps = {
  id: string;
  buttonMsg: string;
  handleAvatarChange: (imageSrc: string) => void;
  imageSrc?: string;
  target: string;
  fieldName: string;
  triggerButtonColor?: ButtonColor;
  uploadInstruction?: string;
  disabled?: boolean;
  height?: number; // Now optional for dynamic height support
  width?: number; // Optional for dynamic width support
  mimeType: string | string[];
};

function CropContainer({
  onCropComplete,
  imageSrc,
  aspect,
}: {
  imageSrc: string;
  onCropComplete: (croppedAreaPixels: Area) => void;
  aspect?: number; // Optional aspect ratio
}) {
  const { t } = useLocale();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [containerStyle, setContainerStyle] = useState({ width: "40rem", height: "13rem" });
  const [cropSize, setCropSize] = useState<{ width: number; height: number } | undefined>(undefined);

  const handleZoomSliderChange = (value: number) => {
    setZoom(value);
  };

  useEffect(() => {
    const loadImageDimensions = async () => {
      const img = await createImage(imageSrc);
      const imgAspect = img.naturalWidth / img.naturalHeight;

      // Calculate container dimensions to fit within dialog
      // Dialog content width is approximately 45rem (720px) with padding
      const maxWidth = 600; // Conservative width to account for dialog padding
      const maxHeight = 400; // ~25rem

      let containerWidth = maxWidth;
      let containerHeight = maxWidth / imgAspect;

      // If calculated height exceeds max, constrain by height instead
      if (containerHeight > maxHeight) {
        containerHeight = maxHeight;
        containerWidth = maxHeight * imgAspect;
      }

      // Ensure width doesn't exceed max even after height constraint
      if (containerWidth > maxWidth) {
        containerWidth = maxWidth;
        containerHeight = maxWidth / imgAspect;
      }

      setContainerStyle({
        width: `${containerWidth}px`,
        height: `${containerHeight}px`,
      });

      // When no aspect ratio is set, make crop size match container so entire image is selectable
      if (!aspect) {
        setCropSize({
          width: containerWidth,
          height: containerHeight,
        });
      }
    };

    loadImageDimensions();
  }, [imageSrc, aspect]);

  return (
    <div className="flex w-full max-w-full flex-col items-center justify-center px-4">
      <div className="relative max-w-full" style={containerStyle}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          cropSize={cropSize}
          onCropChange={setCrop}
          onCropComplete={(croppedArea, croppedAreaPixels) => onCropComplete(croppedAreaPixels)}
          onZoomChange={setZoom}
          minZoom={0.1}
          maxZoom={3}
          restrictPosition={false}
          showGrid={true}
          objectFit="contain"
        />
      </div>
      <Slider
        value={zoom}
        min={0.1}
        max={3}
        step={0.01}
        label={t("slide_zoom_drag_instructions")}
        changeHandler={handleZoomSliderChange}
      />
    </div>
  );
}

export default function BannerUploader({
  target,
  fieldName,
  id,
  mimeType,
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      triggerToast(t("image_size_limit_exceed"), "error");
    } else {
      console.log("__file", file);
      setFile(file);
    }
  };

  const showCroppedImage = useCallback(
    async (croppedAreaPixels: Area | null) => {
      try {
        if (!croppedAreaPixels) return;

        // Calculate final dimensions based on what's provided
        let finalWidth = width;
        let finalHeight = height;

        // If one dimension is missing, calculate it from the crop area to maintain aspect ratio
        if (width !== undefined && height === undefined) {
          // Fixed width, calculate height from crop aspect ratio
          const cropAspect = croppedAreaPixels.width / croppedAreaPixels.height;
          finalHeight = Math.round(width / cropAspect);
        } else if (height !== undefined && width === undefined) {
          // Fixed height, calculate width from crop aspect ratio
          const cropAspect = croppedAreaPixels.width / croppedAreaPixels.height;
          finalWidth = Math.round(height * cropAspect);
        }

        const croppedImage = await getCroppedImg(
          result as string /* result is always string when using readAsDataUrl */,
          croppedAreaPixels,
          finalHeight,
          finalWidth
        );
        handleAvatarChange(croppedImage);
        setIsDialogOpen(false);
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

      // Check dimensions based on what's specified
      const hasWidth = width !== undefined;
      const hasHeight = height !== undefined;

      if (hasWidth && hasHeight) {
        // Fixed width + fixed height
        if (image.naturalWidth !== width || image.naturalHeight !== height) {
          triggerToast(t("org_banner_instructions", { height, width }), "warning");
        }
      } else if (hasWidth && !hasHeight) {
        // Fixed width + dynamic height
        if (image.naturalWidth !== width) {
          triggerToast(
            t("banner_width_requirement", { width }) || `Image must be ${width}px in width`,
            "warning"
          );
        }
      } else if (!hasWidth && hasHeight) {
        // Dynamic width + fixed height
        if (image.naturalHeight !== height) {
          triggerToast(
            t("banner_height_requirement", { height }) || `Image must be ${height}px in height`,
            "warning"
          );
        }
      }
      // If both are undefined, no validation (fully dynamic)
    };
    if (result) {
      checkDimensions();
    }
  }, [result, height, width, t]);

  // Calculate aspect ratio only if both width and height are provided
  const aspectRatio = width && height ? width / height : undefined;

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={(opened) => {
        setIsDialogOpen(opened);
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
      <DialogContent
        size="lg"
        className="max-w-[95vw] sm:w-[45rem] sm:max-w-[45rem]"
        title={t("upload_target", { target: fieldName || target })}
        enableOverflow={false}>
        <DialogHeader>
          <DialogTitle>{t("upload_target", { target: fieldName || target })}</DialogTitle>
        </DialogHeader>
        <div className="mb-4 overflow-hidden">
          <div className="cropper mt-6 flex flex-col items-center justify-center p-8">
            {!result && (
              <div className="bg-muted flex h-60 w-full items-center justify-center">
                {!imageSrc ? (
                  <div className="bg-cal-gradient dark:bg-cal-gradient h-full w-full" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="h-full w-auto object-contain" src={imageSrc} alt={target} />
                )}
              </div>
            )}
            {result && (
              <CropContainer
                aspect={aspectRatio}
                imageSrc={result as string}
                onCropComplete={setCroppedAreaPixels}
              />
            )}
            <label
              data-testid="open-upload-image-filechooser"
              className="bg-subtle hover:bg-muted hover:text-emphasis border-subtle text-default mt-8 cursor-pointer rounded-sm border px-3 py-1 text-xs font-medium leading-4 transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-1">
              <input
                onInput={onInputFile}
                type="file"
                name={id}
                placeholder={t("upload_image")}
                className="text-default pointer-events-none absolute mt-4 opacity-0 "
                accept={
                  mimeType
                    ? typeof mimeType === "string"
                      ? mimeType
                      : mimeType.filter(Boolean).join(",")
                    : "image/*"
                }
              />
              {t("choose_a_file")}
            </label>
            {uploadInstruction && (
              <p className="text-muted mt-4 text-center text-sm">({uploadInstruction})</p>
            )}
          </div>
        </div>
        <DialogFooter className="relative">
          <DialogClose />
          <Button
            data-testid="upload-avatar"
            color="primary"
            onClick={() => showCroppedImage(croppedAreaPixels)}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  height?: number,
  width?: number
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

  // Determine final canvas dimensions
  // If both are provided, use them directly
  // If both are undefined, use the crop area dimensions
  // If only one is provided, it should have been calculated in showCroppedImage
  canvas.width = width !== undefined ? width : pixelCrop.width;
  canvas.height = height !== undefined ? height : pixelCrop.height;

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
