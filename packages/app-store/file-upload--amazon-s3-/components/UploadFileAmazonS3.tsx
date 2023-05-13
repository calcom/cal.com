import useApp from "@calcom/lib/hooks/useApp";
import { FileUploader } from "@calcom/ui";

type UploadFileAmazonS3Props = {
  setValue: (value: File) => void;
  value: File | undefined;
};

export default function UploadFileAmazonS3(props: UploadFileAmazonS3Props) {
  const { data: fileUploadApp } = useApp("file-upload--amazon-s3-");

  return fileUploadApp && <FileUploader {...props} />;
}
