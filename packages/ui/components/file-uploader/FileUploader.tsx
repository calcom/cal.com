import { useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { AiFillFile } from "react-icons/ai";
import { FiUploadCloud } from "react-icons/fi";

type FileUploaderProps = {
  setValue: (value: File) => void;
  value: File | undefined;
};

// props: FileUploaderProps
export default function FileUploader({ value, setValue }: FileUploaderProps) {
  const { acceptedFiles, getRootProps, getInputProps } = useDropzone({ maxFiles: 1 });

  useEffect(() => {
    if (acceptedFiles.length > 0) {
      setValue(acceptedFiles[0]);
    }
  }, [acceptedFiles, setValue]);

  return (
    <>
      <div className="flex h-40 w-full flex-col items-center justify-center rounded-md border-2 border-dashed">
        <div
          {...getRootProps({ className: "dropzone" })}
          className="flex h-full w-full flex-col items-center justify-center space-y-1">
          <input {...getInputProps()} />
          {/* Wrap the FiUploadCloud in a circle */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            {value ? (
              <AiFillFile className="h-5 w-5 text-black" />
            ) : (
              <FiUploadCloud className="h-5 w-5 text-black" />
            )}
          </div>
          {value ? (
            <>
              <p className="text-sm font-semibold text-black text-gray-700">{value.name}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-black text-gray-700">Drag & drop here</p>
              <p className="text-sm text-gray-600">
                or <span className="underline decoration-dashed">browse your files</span>.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
