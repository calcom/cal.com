import { useState, useEffect } from "react";

import { UserCircle } from "../../ui/icons/user";

const PhotoUpload = (props) => {
  useEffect(() => {
    if (props.avatarUrl) {
      setImageUrl(props.avatarUrl);
    }
  }, [props.avatarUrl]);

  const [imageUrl, setImageUrl] = useState(null);

  async function handleFileChange(event) {
    const file = event.target.files[0];
    const blobUrl = await generateBlobUrl(file);
    setImageUrl(blobUrl);
    props.onPhotoChange(file);
  }

  function generateBlobUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  return (
    <div className="col-span-full">
      <label htmlFor="photo" className="inline-block text-sm font-medium leading-6 text-gray-900">
        Photo
      </label>
      <div className="mt-2 flex items-center gap-x-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            className="h-12 w-12 flex-shrink-0 rounded-full ring-2 ring-gray-300 ring-opacity-50"
            alt="uploaded"
          />
        ) : (
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center text-gray-300">
            <UserCircle className="h-12 w-12 text-gray-300" />
          </span>
        )}
        <input type="file" id="photo" accept="image/*" className="hidden" onChange={handleFileChange} />
        <button
          type="button"
          className="rounded-md bg-white px-2 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          onClick={() => document.getElementById("photo").click()}>
          {imageUrl ? "Change" : "Upload"}
        </button>
      </div>
    </div>
  );
};

export default PhotoUpload;
