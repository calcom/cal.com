import Cropper from "react-easy-crop";
import { useState, useCallback, useRef } from "react";
import Slider from "./Slider";

export default function ImageUploader({ target, id, buttonMsg, handleAvatarChange, imageRef }) {
  const imageFileRef = useRef<HTMLInputElement>();
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
    const img = await readFile(imageFileRef.current.files[0]);
    setImageDataUrl(img);
    CropHandler();
  }

  const readFile = (file) => {
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

  const handleZoomSliderChange = ([value]) => {
    value < 1 ? setZoom(1) : setZoom(value);
  };

  const createImage = (url) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.setAttribute("crossOrigin", "anonymous"); // needed to avoid cross-origin issues on CodeSandbox
      image.src = url;
    });

  function getRadianAngle(degreeValue) {
    return (degreeValue * Math.PI) / 180;
  }

  async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
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
    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate(getRadianAngle(rotation));
    ctx.translate(-safeArea / 2, -safeArea / 2);

    // draw rotated image and store data.
    ctx.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5);
    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    // set canvas width to final desired crop size - this will clear existing context
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // paste generated rotate image with correct offsets for x,y crop values.
    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    // As Base64 string
    return canvas.toDataURL("image/jpeg");
  }

  const showCroppedImage = useCallback(async () => {
    try {
      const croppedImage = await getCroppedImg(imageDataUrl, croppedAreaPixels, rotation);
      setIsImageShown(true);
      setShownImage(croppedImage);
      setImageLoaded(false);
      handleAvatarChange(croppedImage);
      closeImageUploadModal();
    } catch (e) {
      console.error(e);
    }
  }, [croppedAreaPixels, rotation]);

  return (
    <div className="flex justify-center items-center">
      <button
        type="button"
        className="ml-4 cursor-pointer inline-flex items-center px-4 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500;"
        onClick={openUploaderModal}>
        {buttonMsg}
      </button>

      {imageUploadModalOpen && (
        <div
          className="fixed z-10 inset-0 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>

            <div className="inline-block align-bottom bg-white rounded-sm px-4 pt-5 pb-4 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start mb-4">
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg leading-6 font-bold text-gray-900" id="modal-title">
                    Upload {target}
                  </h3>
                </div>
              </div>
              <div className="mb-4">
                <div className="cropper mt-6 flex flex-col justify-center items-center p-8 bg-gray-50">
                  {!imageLoaded && (
                    <div className="flex justify-start items-center bg-gray-500 max-h-20 h-20 w-20 rounded-full">
                      {!isImageShown && (
                        <p className="sm:text-xs text-sm text-white w-full text-center">No {target}</p>
                      )}
                      {isImageShown && (
                        <img className="h-20 w-20 rounded-full" src={shownImage} alt={target} />
                      )}
                    </div>
                  )}
                  {imageLoaded && (
                    <div className="crop-container max-h-40 h-40 w-40 rounded-full">
                      <div className="relative h-40 w-40 rounded-full">
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
                    className="mt-4 pointer-events-none opacity-0 absolute"
                    accept="image/*"
                  />
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button type="button" className="btn btn-primary" onClick={showCroppedImage}>
                  Save
                </button>
                <button onClick={closeImageUploadModal} type="button" className="btn btn-white mr-2">
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
