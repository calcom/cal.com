"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";

import checkIfItFallbackImage from "@calcom/lib/checkIfItFallbackImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { ButtonColor, ButtonProps } from "../button";
import { Button } from "../button";
import { Dialog, DialogClose, DialogContent, DialogTrigger, DialogFooter } from "../dialog";
import { showToast } from "../toast";
import { useFileReader, createImage, Slider } from "./Common";
import type { FileEvent, Area } from "./Common";

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

  /**
   * Enhanced browser-compatible image validation with magic number checking
   */
  const validateImageFile = async (file: File): Promise<boolean> => {
    const limit = 5 * 1000000; // max limit 5mb
    if (file.size > limit) {
      showToast(t("image_size_limit_exceed"), "error");
      return false;
    }

    if (!file.type.startsWith("image/")) {
      showToast(t("only_image_files_allowed"), "error");
      return false;
    }

    try {
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      // Check for dangerous file types first - PDF detection
      if (
        uint8Array.length >= 4 &&
        uint8Array[0] === 0x25 &&
        uint8Array[1] === 0x50 &&
        uint8Array[2] === 0x44 &&
        uint8Array[3] === 0x46
      ) {
        showToast(t("pdf_files_cannot_be_uploaded_as_images"), "error");
        return false;
      }

      // Check for HTML content
      if (
        uint8Array.length >= 9 &&
        uint8Array[0] === 0x3c &&
        uint8Array[1] === 0x21 &&
        uint8Array[2] === 0x44 &&
        uint8Array[3] === 0x4f &&
        uint8Array[4] === 0x43 &&
        uint8Array[5] === 0x54 &&
        uint8Array[6] === 0x59 &&
        uint8Array[7] === 0x50 &&
        uint8Array[8] === 0x45
      ) {
        showToast(t("html_files_cannot_be_uploaded_as_images"), "error");
        return false;
      }

      // Check for script tags
      if (
        uint8Array.length >= 7 &&
        uint8Array[0] === 0x3c &&
        uint8Array[1] === 0x73 &&
        uint8Array[2] === 0x63 &&
        uint8Array[3] === 0x72 &&
        uint8Array[4] === 0x69 &&
        uint8Array[5] === 0x70 &&
        uint8Array[6] === 0x74
      ) {
        showToast(t("script_files_cannot_be_uploaded_as_images"), "error");
        return false;
      }

      // Check for ZIP files
      if (
        uint8Array.length >= 4 &&
        uint8Array[0] === 0x50 &&
        uint8Array[1] === 0x4b &&
        uint8Array[2] === 0x03 &&
        uint8Array[3] === 0x04
      ) {
        showToast(t("zip_files_cannot_be_uploaded_as_images"), "error");
        return false;
      }

      // Check for executable files
      if (uint8Array.length >= 2 && uint8Array[0] === 0x4d && uint8Array[1] === 0x5a) {
        showToast(t("executable_files_cannot_be_uploaded_as_images"), "error");
        return false;
      }

      // Check for valid image formats
      const isValidImage =
        // PNG
        (uint8Array.length >= 8 &&
          uint8Array[0] === 0x89 &&
          uint8Array[1] === 0x50 &&
          uint8Array[2] === 0x4e &&
          uint8Array[3] === 0x47) ||
        // JPEG
        (uint8Array.length >= 3 &&
          uint8Array[0] === 0xff &&
          uint8Array[1] === 0xd8 &&
          uint8Array[2] === 0xff) ||
        // GIF
        (uint8Array.length >= 6 &&
          uint8Array[0] === 0x47 &&
          uint8Array[1] === 0x49 &&
          uint8Array[2] === 0x46 &&
          uint8Array[3] === 0x38) ||
        // WEBP (RIFF followed by WEBP)
        (uint8Array.length >= 12 &&
          uint8Array[0] === 0x52 &&
          uint8Array[1] === 0x49 &&
          uint8Array[2] === 0x46 &&
          uint8Array[3] === 0x46 &&
          uint8Array[8] === 0x57 &&
          uint8Array[9] === 0x45 &&
          uint8Array[10] === 0x42 &&
          uint8Array[11] === 0x50) ||
        // BMP
        (uint8Array.length >= 2 && uint8Array[0] === 0x42 && uint8Array[1] === 0x4d) ||
        // ICO
        (uint8Array.length >= 4 &&
          uint8Array[0] === 0x00 &&
          uint8Array[1] === 0x00 &&
          uint8Array[2] === 0x01 &&
          uint8Array[3] === 0x00);

      if (!isValidImage) {
        showToast(t("invalid_image_file_format"), "error");
        return false;
      }

      return true;
    } catch (error) {
      showToast(t("failed_to_validate_image_file"), "error");
      return false;
    }
  };

  const onInputFile = async (e: FileEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) {
      return;
    }

    const file = e.target.files[0];

    // Validate the file - toast will be shown automatically if invalid
    const isValid = await validateImageFile(file);
    if (!isValid) {
      return;
    }

    setFile(file);
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
          size={buttonSize}
          data-testid={testId ? `open-upload-${testId}-dialog` : "open-upload-avatar-dialog"}
          className="cursor-pointer py-1 text-sm">
          {buttonMsg}
        </Button>
      </DialogTrigger>
      <DialogContent title={t("upload_target", { target })}>
        <div className="mb-4">
          <div className="cropper mt-6 flex flex-col items-center justify-center p-8">
            {!result && (
              <div className="bg-muted flex h-20 max-h-20 w-20 items-center justify-start rounded-full">
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
              className="bg-subtle hover:bg-muted hover:text-emphasis border-subtle text-default mt-8 cursor-pointer rounded-sm border px-3 py-1 text-xs font-medium leading-4 transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-1">
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
            data-testid={testId ? `upload-${testId}` : "upload-avatar"}
            color="primary"
            onClick={() => showCroppedImage(croppedAreaPixels)}>
            {t("save")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
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
