import type { DropzoneOptions } from "react-dropzone";
import { useDropzone } from "react-dropzone";

export type DropZoneProps = DropzoneOptions;

export function DropZone(props: DropZoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ ...props });

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the files here ...</p>
      ) : (
        <p>Drag &apos;n&apos; drop some files here, or click to select files</p>
      )}
    </div>
  );
}
