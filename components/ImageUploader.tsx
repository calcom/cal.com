import Cropper from "react-easy-crop";
import { useState, useCallback, useRef } from "react";
import Slider from "./Slider";

export default function ImageUploader({
  displayName,
  id,
  buttonMsg,
  onChange,
  imageRef,
}: {
  displayName: string;
  id: string;
  buttonMsg: string;
  onChange: (text: string) => void;
  imageRef: string | null | undefined;
}) {
  const imageFileRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;
  const [imageDataUrl, setImageDataUrl] = useState<string>();
  const [croppedAreaPixels, setCroppedAreaPixels] = useState();
  const [rotation] = useState(1);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isImageShown, setIsImageShown] = useState(false);
  const [shownImage, setShownImage] = useState<string>();
  const [imageUploadModalOpen, setImageUploadModalOpen] = useState(false);

  const openUploaderModal = () => {
    imageRef ? (setIsImageShown(true), setShownImage(imageRef)) : setIsImageShown(false);
    setImageUploadModalOpen(!imageUploadModalOpen);
  };

  const closeImageUploadModal = () => {
    setImageUploadModalOpen(false);
  };

  async function ImageUploadHandler() {
    if (imageFileRef.current.files !== null) {
      const img: string = await readFile(imageFileRef.current.files[0]);
      setImageDataUrl(img);
      CropHandler();
    }
  }

  const readFile = (file: File) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const CropHandler = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setImageLoaded(true);
  };

  const handleZoomSliderChange = ([value]: [number]) => {
    value < 1 ? setZoom(1) : setZoom(value);
  };

  const createImage = (url: string | undefined) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.setAttribute("crossOrigin", "anonymous"); // needed to avoid cross-origin issues on CodeSandbox
      if (url) image.src = url;
    });

  function getRadianAngle(degreeValue: number) {
    return (degreeValue * Math.PI) / 180;
  }
  async function getCroppedImg(
    imageSrc: string | undefined,
    pixelCrop: { x: number; y: number; width: number; height: number } | undefined,
    rotation = 0
  ) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    // set each dimensions to double largest dimension to allow for a safe area for the
    // image to rotate in without being clipped by canvas context
    canvas.width = safeArea;
    canvas.height = safeArea;

    // translate canvas context to a central location on image to allow rotating around the center.
    ctx?.translate(safeArea / 2, safeArea / 2);
    ctx?.rotate(getRadianAngle(rotation));
    ctx?.translate(-safeArea / 2, -safeArea / 2);

    // draw rotated image and store data.
    ctx?.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5);
    const data = ctx?.getImageData(0, 0, safeArea, safeArea);

    // set canvas width to final desired crop size - this will clear existing context
    if (pixelCrop) {
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      // paste generated rotate image with correct offsets for x,y crop values.
      data &&
        ctx?.putImageData(
          data,
          Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
          Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
        );
    }

    // As Base64 string
    return canvas.toDataURL("image/jpeg");
  }

  const showCroppedImage = useCallback(async () => {
    try {
      const croppedImage = await getCroppedImg(imageDataUrl, croppedAreaPixels, rotation);
      setIsImageShown(true);
      setShownImage(croppedImage);
      setImageLoaded(false);
      onChange(croppedImage);
      closeImageUploadModal();
    } catch (e) {
      console.error(e);
    }
  }, [croppedAreaPixels, rotation]);

  return (
    <div className="flex items-center justify-center">
      <button
        type="button"
        className="ml-4 cursor-pointer inline-flex items-center px-4 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500;"
        onClick={openUploaderModal}>
        {buttonMsg}
      </button>

      {imageUploadModalOpen && (
        <div
          className="fixed inset-0 z-10 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true">
          <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              aria-hidden="true"></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>

            <div className="inline-block px-4 pt-5 pb-4 text-left align-bottom transition-all transform bg-white rounded-sm shadow-xl sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
              <div className="mb-4 sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg font-bold leading-6 text-gray-900" id="modal-title">
                    Upload {displayName}
                  </h3>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex flex-col items-center justify-center p-8 mt-6 cropper bg-gray-50">
                  {!imageLoaded && (
                    <div className="flex items-center justify-start w-20 h-20 bg-gray-500 rounded-full max-h-20">
                      {!isImageShown && (
                        <p className="w-full text-sm text-center text-white sm:text-xs">No {displayName}</p>
                      )}
                      {isImageShown && (
                        <img className="w-20 h-20 rounded-full" src={shownImage} alt={displayName} />
                      )}
                    </div>
                  )}
                  {imageLoaded && (
                    <div className="w-40 h-40 rounded-full crop-container max-h-40">
                      <div className="relative w-40 h-40 rounded-full">
                        <Cropper
                          image={imageDataUrl}
                          crop={crop}
                          zoom={zoom}
                          aspect={1 / 1}
                          onCropChange={setCrop}
                          onCropComplete={onCropComplete}
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
                  )}
                  <label
                    htmlFor={id}
                    className="mt-8 cursor-pointer inline-flex items-center px-4 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500;">
                    Choose a file...
                  </label>
                  <input
                    onChange={ImageUploadHandler}
                    ref={imageFileRef}
                    type="file"
                    id={id}
                    name={id}
                    placeholder="Upload image"
                    className="absolute mt-4 opacity-0 pointer-events-none"
                    accept="image/*"
                  />
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button type="button" className="btn btn-primary" onClick={showCroppedImage}>
                  Save
                </button>
                <button onClick={closeImageUploadModal} type="button" className="mr-2 btn btn-white">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
