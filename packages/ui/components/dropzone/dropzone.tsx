import type { DropzoneOptions } from "react-dropzone";
import { useDropzone } from "react-dropzone";

import { UploadCloud } from "../icon";

export type DropZoneProps = DropzoneOptions;

export function DropZone(props: DropZoneProps) {
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    ...props,
  });

  return (
    <div className="border-default cursor-pointer rounded-md border-2 border-dashed p-5" {...getRootProps()}>
      <input {...getInputProps()} />

      <div className="flex items-center justify-center ">
        <div className="bg-subtle rounded-full p-3">
          <UploadCloud />
        </div>
      </div>
      <div className="pt-2 text-center text-sm">
        {acceptedFiles.length === 0 ? (
          isDragActive ? (
            <p>Drop the files here ...</p>
          ) : (
            <p>Drag &apos;n&apos; drop some files here, or click to select files</p>
          )
        ) : (
          <p>{acceptedFiles[0].name}</p>
        )}
      </div>
    </div>
  );
}
