"use client";

import { Input } from "@calid/features/ui/components/input/input";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useCallback, useState } from "react";
import React from "react";
import Cropper from "react-easy-crop";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button } from "../button";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogTrigger,
  DialogFooter,
} from "../dialog";

// Utility functions for cropping
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Slider component for zoom control
const ZoomSlider = ({
  value,
  onChange,
  min = 1,
  max = 3,
  step = 0.1,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) => {
  return (
    <div className="mt-4 w-full">
      <label className="mb-2 block text-sm text-gray-600">Zoom: {value.toFixed(1)}x</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
      />
    </div>
  );
};

// Crop container component
const CropContainer = ({
  imageSrc,
  onCropComplete,
}: {
  imageSrc: string;
  onCropComplete: (croppedAreaPixels: Area) => void;
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const handleZoomChange = (value: number) => {
    setZoom(value < 1 ? 1 : value);
  };

  return (
    <div className="crop-container">
      <div className="relative mx-auto mb-4 h-40 w-40 rounded-full">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onCropComplete={(croppedArea, croppedAreaPixels) => onCropComplete(croppedAreaPixels)}
          onZoomChange={setZoom}
          restrictPosition={false}
        />
      </div>
      <div className="mb-2 text-center">
        <p className="text-xs text-gray-500">Drag to reposition • Scroll or use slider to zoom</p>
      </div>
      <ZoomSlider value={zoom} onChange={handleZoomChange} min={1} max={3} step={0.1} />
    </div>
  );
};

// Function to get cropped image
const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const maxSize = 512;
  const size = Math.min(maxSize, pixelCrop.width);

  canvas.width = size;
  canvas.height = size;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", 0.9);
};

interface CustomImageUploaderProps {
  targetId: string;
  buttonText: string;
  onImageChange: (imageDataUrl: string) => void;
  currentImageSrc?: string;
  targetType: string;
  buttonColor?: string;
  uploadHint?: string;
  isDisabled?: boolean;
  testIdentifier?: string;
}

export default function CustomImageUploader({
  targetId,
  buttonText,
  onImageChange,
  currentImageSrc,
  targetType,
  buttonColor = "secondary",
  uploadHint,
  isDisabled = false,
  testIdentifier,
}: CustomImageUploaderProps) {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  const handleFileSelection = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    const maxSize = 5 * 1024 * 1024; // 5MB limit

    if (file.size > maxSize) {
      triggerToast(t("file_too_large"), "error");
      return;
    }

    if (!file.type.startsWith("image/")) {
      triggerToast(t("file_type_not_supported"), "error");
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreviewUrl(result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageUpload = useCallback(async () => {
    if (!selectedFile || !previewUrl || !croppedAreaPixels) return;

    setIsProcessing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const croppedImage = await getCroppedImg(previewUrl, croppedAreaPixels);
      onImageChange(croppedImage);

      // Reset state
      setSelectedFile(null);
      setPreviewUrl(null);
      setCroppedAreaPixels(null);
      setShowCropper(false);
      setOpen(false);
    } catch (error) {
      triggerToast(t("failed_to_upload_image"), "error");
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, previewUrl, croppedAreaPixels, onImageChange]);

  const handleCropComplete = useCallback((croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const resetUploader = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCroppedAreaPixels(null);
    setShowCropper(false);
  }, []);

  const getButtonTestId = () => {
    if (testIdentifier) {
      return `open-upload-${testIdentifier}-dialog`;
    }
    return `open-upload-${targetType}-dialog`;
  };

  const getUploadTestId = () => {
    if (testIdentifier) {
      return `upload-${testIdentifier}`;
    }
    return `upload-${targetType}`;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(opened) => {
        setOpen(opened);
        if (!opened) {
          resetUploader();
        }
      }}>
      <DialogTrigger asChild>
        <Button
          StartIcon="upload"
          color={buttonColor as any}
          disabled={isDisabled}
          variant="button"
          className="hover:border-emphasis"
          data-testid={getButtonTestId()}>
          {buttonText}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("upload_logo")}</DialogTitle>
          <DialogDescription>{t("upload_logo_description")}</DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <div className="upload-container mt-6 flex flex-col items-center justify-center p-8">
            {/* Preview Section */}
            {!showCropper && (
              <div className="preview-placeholder bg-muted mb-4 flex h-20 max-h-20 w-20 items-center justify-start rounded-full">
                {!currentImageSrc ? (
                  <p className="text-muted-foreground w-full text-center text-sm">No {targetType} selected</p>
                ) : (
                  <img
                    className="h-20 w-20 rounded-full object-cover"
                    src={currentImageSrc}
                    alt={targetType}
                  />
                )}
              </div>
            )}

            {showCropper && previewUrl && (
              <CropContainer imageSrc={previewUrl} onCropComplete={handleCropComplete} />
            )}

            {/* File Input - only show when not cropping */}
            {!showCropper && (
              <label
                data-testid="open-upload-image-filechooser"
                className="file-input-label hover:bg-muted border-border focus:ring-ring cursor-pointer rounded-md border px-3 py-1 text-xs leading-4 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2">
                <Input
                  onChange={handleFileSelection}
                  type="file"
                  name={targetId}
                  placeholder="Upload image"
                  className="pointer-events-none absolute mt-4 opacity-0"
                  accept="image/*"
                />
                {t("choose_a_file")}
              </label>
            )}

            {uploadHint && !showCropper && (
              <p className="text-muted-foreground mt-4 text-center text-sm">({uploadHint})</p>
            )}
          </div>
        </div>

        <DialogFooter className="relative">
          <Button
            color="secondary"
            onClick={() => {
              resetUploader();
              setOpen(false);
            }}>
            {t("cancel")}
          </Button>

          {showCropper && (
            <Button color="secondary" onClick={() => setShowCropper(false)} disabled={isProcessing}>
              Back
            </Button>
          )}

          <Button
            data-testid={getUploadTestId()}
            color="primary"
            onClick={handleImageUpload}
            disabled={!selectedFile || !croppedAreaPixels || isProcessing}>
            {isProcessing ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
