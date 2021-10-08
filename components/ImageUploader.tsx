import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";

import { Area, getCroppedImg } from "@lib/cropImage";
import { useFileReader } from "@lib/hooks/useFileReader";

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

// This is separate to prevent loading the component until file upload
function CropContainer({
  onCropComplete,
  imageSrc,
}: {
  imageSrc: string;
  onCropComplete: (croppedAreaPixels: Area) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const handleZoomSliderChange = ([value]) => {
    value < 1 ? setZoom(1) : setZoom(value);
  };

  return (
    <div className="crop-container max-h-40 h-40 w-40 rounded-full">
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
        label="Slide to zoom, drag to reposition"
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
  const [imageSrc, setImageSrc] = useState<string | null>();
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>();

  const [{ result }, setFile] = useFileReader({
    method: "readAsDataURL",
  });

  useEffect(() => {
    setImageSrc(props.imageSrc);
  }, [props.imageSrc]);

  const onInputFile = (e) => {
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
        <div className="flex items-center px-3">
          <Button color="secondary" type="button" className="py-1 text-xs">
            {buttonMsg}
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent>
        <div className="sm:flex sm:items-start mb-4">
          <div className="mt-3 text-center sm:mt-0 sm:text-left">
            <h3 className="font-cal text-lg leading-6 font-bold text-gray-900" id="modal-title">
              Upload {target}
            </h3>
          </div>
        </div>
        <div className="mb-4">
          <div className="cropper mt-6 flex flex-col justify-center items-center p-8 bg-gray-50">
            {!result && (
              <div className="flex justify-start items-center bg-gray-500 max-h-20 h-20 w-20 rounded-full">
                {!imageSrc && <p className="sm:text-xs text-sm text-white w-full text-center">No {target}</p>}
                {imageSrc && <img className="h-20 w-20 rounded-full" src={imageSrc} alt={target} />}
              </div>
            )}
            {result && <CropContainer imageSrc={result} onCropComplete={setCroppedAreaPixels} />}
            <label className="mt-8 px-3 py-1 text-xs leading-4 font-medium rounded-sm border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-neutral-900 dark:bg-transparent dark:text-white dark:border-gray-800 dark:hover:bg-gray-900">
              <input
                onInput={onInputFile}
                type="file"
                name={id}
                placeholder="Upload image"
                className="mt-4 pointer-events-none opacity-0 absolute"
                accept="image/*"
              />
              Choose a file...
            </label>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-x-2">
          <DialogClose asChild>
            <Button onClick={() => showCroppedImage(croppedAreaPixels)}>Save</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button color="secondary">Cancel</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
