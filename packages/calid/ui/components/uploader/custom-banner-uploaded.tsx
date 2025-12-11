"use client";

import React, { useCallback, useState, useEffect } from "react";
import Cropper from "react-easy-crop";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button } from "../button";
import type { ButtonColor } from "../button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog";
import { triggerToast } from "../toast";
import { createImage, Slider, type Area } from "./common";

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
  height?: number;
  width?: number;
  mimeType: string | string[];
};

function CropContainer({
  onCropComplete,
  imageSrc,
  aspect,
}: {
  imageSrc: string;
  onCropComplete: (croppedAreaPixels: Area) => void;
  aspect?: number;
}) {
  const { t } = useLocale();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [containerStyle, setContainerStyle] = useState({ width: "600px", height: "400px" });

  const handleZoomSliderChange = (value: number) => {
    setZoom(value);
  };

  useEffect(() => {
    const loadImageDimensions = async () => {
      const img = await createImage(imageSrc);
      const imgAspect = img.naturalWidth / img.naturalHeight;

      const maxWidth = 600;
      const maxHeight = 400;

      let containerWidth = maxWidth;
      let containerHeight = maxWidth / imgAspect;

      if (containerHeight > maxHeight) {
        containerHeight = maxHeight;
        containerWidth = maxHeight * imgAspect;
      }

      setContainerStyle({
        width: `${containerWidth}px`,
        height: `${containerHeight}px`,
      });
    };

    loadImageDimensions();
  }, [imageSrc, aspect]);

  return (
    <div className="flex w-full max-w-full flex-col items-center justify-center px-4">
      <div className="relative max-w-full bg-gray-100" style={containerStyle}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onCropComplete={(croppedArea, croppedAreaPixels) => onCropComplete(croppedAreaPixels)}
          onZoomChange={setZoom}
          minZoom={0.5}
          maxZoom={3}
          restrictPosition={false}
          showGrid={true}
          objectFit="contain"
        />
      </div>
      <Slider
        value={zoom}
        min={0.5}
        max={3}
        step={0.01}
        label={t("slide_zoom_drag_instructions")}
        changeHandler={handleZoomSliderChange}
      />
    </div>
  );
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputHeight?: number,
  outputWidth?: number
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // pixelCrop is already in image's natural dimensions from react-easy-crop
  // No scaling needed - use the coordinates directly
  const cropX = pixelCrop.x;
  const cropY = pixelCrop.y;
  const cropWidth = pixelCrop.width;
  const cropHeight = pixelCrop.height;

  // Set output dimensions
  canvas.width = outputWidth ?? cropWidth;
  canvas.height = outputHeight ?? cropHeight;

  // Draw the cropped portion
  ctx.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Detect and preserve original format
  const originalFormat = imageSrc.match(/data:image\/(\w+)/)?.[1] || 'png';
  const mimeType = `image/${originalFormat}`;
  const quality = originalFormat === 'jpeg' || originalFormat === 'jpg' ? 0.9 : undefined;

  return canvas.toDataURL(mimeType, quality);
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const onInputFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    const limit = 1 * 1000000; // 1MB

    if (file.size > limit) {
      triggerToast(t("image_size_limit_exceed_1mb"), "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const showCroppedImage = useCallback(async () => {
    try {
      if (!croppedAreaPixels || !selectedImage) return;

      let finalWidth = width;
      let finalHeight = height;

      // Calculate missing dimension based on crop aspect ratio
      if (width !== undefined && height === undefined) {
        const cropAspect = croppedAreaPixels.width / croppedAreaPixels.height;
        finalHeight = Math.round(width / cropAspect);
      } else if (height !== undefined && width === undefined) {
        const cropAspect = croppedAreaPixels.width / croppedAreaPixels.height;
        finalWidth = Math.round(height * cropAspect);
      }

      const croppedImage = await getCroppedImg(
        selectedImage,
        croppedAreaPixels,
        finalHeight,
        finalWidth
      );

      handleAvatarChange(croppedImage);
      setIsDialogOpen(false);
      setSelectedImage(null);
    } catch (e) {
      console.error("Error cropping image:", e);
      triggerToast(t("error_updating_settings"), "error");
    }
  }, [selectedImage, croppedAreaPixels, height, width, handleAvatarChange, t]);

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSelectedImage(null);
      setCroppedAreaPixels(null);
    }
  };

  useEffect(() => {
    if (!selectedImage) return;

    const checkDimensions = async () => {
      const image = await createImage(selectedImage);
      const hasWidth = width !== undefined;
      const hasHeight = height !== undefined;

      if (hasWidth && hasHeight) {
        if (image.naturalWidth < width || image.naturalHeight < height) {
          triggerToast(t("org_banner_instructions", { height, width }), "warning");
        }
      } else if (hasWidth && !hasHeight) {
        if (image.naturalWidth < width) {
          triggerToast(
            t("banner_width_requirement", { width }) || `Image must be ${width}px in width`,
            "warning"
          );
        }
      } else if (!hasWidth && hasHeight) {
        if (image.naturalHeight < height) {
          triggerToast(
            t("banner_height_requirement", { height }) || `Image must be ${height}px in height`,
            "warning"
          );
        }
      }
    };

    checkDimensions();
  }, [selectedImage, height, width, t]);

  const aspectRatio = width && height ? width / height : undefined;

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
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
            {selectedImage ? (
              <CropContainer
                aspect={aspectRatio}
                imageSrc={selectedImage}
                onCropComplete={setCroppedAreaPixels}
              />
            ) : (
              <div className="bg-muted flex h-60 w-full items-center justify-center">
                {!imageSrc ? (
                  <div className="bg-cal-gradient dark:bg-cal-gradient h-full w-full" />
                ) : (
                  <img className="h-full w-auto object-contain" src={imageSrc} alt={target} />
                )}
              </div>
            )}
            <label
              data-testid="open-upload-image-filechooser"
              className="bg-subtle hover:bg-muted hover:text-emphasis border-subtle text-default mt-8 cursor-pointer rounded-sm border px-3 py-1 text-xs font-medium leading-4 transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-1">
              <input
                onInput={onInputFile}
                type="file"
                name={id}
                placeholder={t("upload_image")}
                className="text-default pointer-events-none absolute mt-4 opacity-0"
                accept={
                  mimeType
                    ? typeof mimeType === "string"
                      ? mimeType
                      : mimeType.filter(Boolean).join(",")
                    : "image/*"
                }
              />
              {selectedImage ? t("change_file") || "Change file" : t("choose_a_file")}
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
            onClick={showCroppedImage}
            disabled={!selectedImage || !croppedAreaPixels}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}