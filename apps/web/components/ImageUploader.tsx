import { FormEvent, useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";

import { Area, getCroppedImg } from "@lib/cropImage";
import { useFileReader } from "@lib/hooks/useFileReader";
import { useLocale } from "@lib/hooks/useLocale";

import { DialogClose, DialogTrigger, Dialog, DialogContent } from "@components/Dialog";
import Slider from "@components/Slider";
import Button from "@components/ui/Button";

type ImageUploaderProps = {
  id: string;
  buttonMsg: string;
  handleAvatarChange: (imageSrc: string) => void;
  imageSrc?: string;
  target: string;
};

interface FileEvent<T = Element> extends FormEvent<T> {
  target: EventTarget & T;
}

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
  ...props
}: ImageUploaderProps) {
  const { t } = useLocale();
  const [imageSrc, setImageSrc] = useState<string | null>();
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>();

  const [{ result }, setFile] = useFileReader({
    method: "readAsDataURL",
  });

  useEffect(() => {
    setImageSrc(props.imageSrc);
  }, [props.imageSrc]);

  const onInputFile = (e: FileEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) {
      return;
    }
    setFile(e.target.files[0]);
  };

  const showCroppedImage = useCallback(
    async (croppedAreaPixels) => {
      try {
        const croppedImage = await getCroppedImg(
          result as string /* result is always string when using readAsDataUrl */,
          croppedAreaPixels
        );
        setImageSrc(croppedImage);
        handleAvatarChange(croppedImage);
      } catch (e) {
        console.error(e);
      }
    },
    [result, handleAvatarChange]
  );

  return (
    <Dialog
      onOpenChange={
        (opened) => !opened && setFile(null) // unset file on close
      }>
      <DialogTrigger asChild>
        <div className="flex items-center">
          <Button color="secondary" type="button" className="py-1 text-xs">
            {buttonMsg}
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent>
        <div className="mb-4 sm:flex sm:items-start">
          <div className="mt-3 text-center sm:mt-0 sm:text-left">
            <h3 className="font-cal text-lg font-bold leading-6 text-gray-900" id="modal-title">
              {t("upload_target", { target })}
            </h3>
          </div>
        </div>
        <div className="mb-4">
          <div className="cropper mt-6 flex flex-col items-center justify-center p-8">
            {!result && (
              <div className="flex h-20 max-h-20 w-20 items-center justify-start rounded-full bg-gray-50">
                {!imageSrc && (
                  <p className="w-full text-center text-sm text-white sm:text-xs">
                    {t("no_target", { target })}
                  </p>
                )}
                {imageSrc && <img className="h-20 w-20 rounded-full" src={imageSrc} alt={target} />}
              </div>
            )}
            {result && <CropContainer imageSrc={result as string} onCropComplete={setCroppedAreaPixels} />}
            <label className="mt-8 rounded-sm border border-gray-300 bg-white px-3 py-1 text-xs font-medium leading-4 text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-1 dark:border-gray-800 dark:bg-transparent dark:text-white dark:hover:bg-gray-900">
              <input
                onInput={onInputFile}
                type="file"
                name={id}
                placeholder={t("upload_image")}
                className="pointer-events-none absolute mt-4 opacity-0"
                accept="image/*"
              />
              {t("choose_a_file")}
            </label>
          </div>
        </div>
        <div className="mt-5 gap-x-2 sm:mt-4 sm:flex sm:flex-row-reverse">
          <DialogClose asChild>
            <Button onClick={() => showCroppedImage(croppedAreaPixels)}>{t("save")}</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button color="secondary">{t("cancel")}</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
