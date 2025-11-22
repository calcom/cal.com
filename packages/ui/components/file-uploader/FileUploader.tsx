"use client";

import { useCallback, useState } from "react";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button } from "../button";
import { Input, Label } from "../form";
import { Icon } from "../icon";
import { showToast } from "../toast";

export interface FileData {
  file: File;
  dataUrl: string;
  id: string;
}

interface FileUploaderProps {
  id: string;
  buttonMsg?: string;
  onFilesChange: (allFiles: FileData[], newFiles: FileData[], removedFiles: FileData[]) => void;
  acceptedFileTypes?: TAcceptedFileTypes[];
  showFilesList?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  disabled?: boolean;
  testId?: string;
  multiple?: boolean;
}

const zAcceptedFileTypes = z.enum(["any", "images", "videos", "csv", "documents"]);
type TAcceptedFileTypes = z.infer<typeof zAcceptedFileTypes>;

const documentTypes = [
  "application/pdf", // .pdf
  "text/plain", // .txt
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/csv", // .csv
];

const acceptFileTypes: Record<TAcceptedFileTypes, { types: string[]; extensions: string[] }> = {
  any: { types: [], extensions: [] },
  images: {
    types: ["image/png", "image/jpeg"],
    extensions: [".png", ".jpg", ".jpeg"],
  },
  csv: {
    types: ["text/csv"],
    extensions: [".csv"],
  },
  documents: {
    types: documentTypes,
    extensions: [".pdf", ".txt", ".doc", ".docx", ".xls", ".xlsx", ".csv"],
  },
  videos: {
    types: ["video/mp4", "video/webm", "video/ogg"],
    extensions: [".mp4", ".webm", ".ogg"],
  },
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default function FileUploader({
  id,
  buttonMsg,
  onFilesChange,
  acceptedFileTypes = ["any"],
  maxFiles,
  maxFileSize = 10 * 1024 * 1024,
  disabled = false,
  multiple = true,
  showFilesList = true,
  testId,
}: FileUploaderProps) {
  const { t, isLocaleReady } = useLocale();
  const [files, setFiles] = useState<FileData[]>([]);

  const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const defaultT = {
    add_files: "Add Files",
    file_size_limit_exceed: "File size exceeds limit",
    invalid_file_type: "Invalid file type",
    max_files_exceeded: "Maximum files exceeded",
    files_uploaded_successfully: "Files uploaded successfully",
    file_upload_instructions: "Upload images or videos",
  };

  const allowedTypes = acceptedFileTypes.flatMap((type) => acceptFileTypes[type].types);
  const allowedExtensions = acceptedFileTypes.flatMap((type) => acceptFileTypes[type].extensions);

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return isLocaleReady ? t("file_size_limit_exceed") : defaultT["file_size_limit_exceed"];
    }

    if (acceptedFileTypes.includes("any")) {
      return null;
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      const extensionsString = allowedExtensions.join(",");
      return isLocaleReady
        ? t("invalid_file_type_with_extensions", { extensions: extensionsString })
        : `Invalid file type. Allowed: ${extensionsString}`;
    }

    return null;
  };

  const handleFileSelect = useCallback(
    async (selectedFiles: FileList) => {
      const newFiles: FileData[] = [];
      const errors: string[] = [];

      if (maxFiles && files.length + selectedFiles.length > maxFiles) {
        const maxFileText = isLocaleReady ? t("max_files_exceeded") : `${defaultT["max_files_exceeded"]}`;
        showToast(maxFileText, "error");
        return;
      }

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const validationError = validateFile(file);

        if (validationError) {
          errors.push(`${file.name}: ${validationError}`);
          continue;
        }

        try {
          const dataUrl = await readFileAsDataURL(file);
          newFiles.push({
            file,
            dataUrl,
            id: generateFileId(),
          });
        } catch (error) {
          errors.push(`${file.name}: Failed to read file`);
        }
      }

      if (errors.length > 0) {
        showToast(errors.join(", "), "error");
      }

      if (newFiles.length > 0) {
        const updatedFiles = [...files, ...newFiles];
        setFiles(updatedFiles);
        onFilesChange(updatedFiles, newFiles, []);
      }
    },
    [files, maxFiles, maxFileSize, acceptedFileTypes, onFilesChange, t]
  );

  const handleFileRemove = useCallback(
    (fileId: string) => {
      const updatedFiles = files.filter((file) => file.id !== fileId);
      setFiles(updatedFiles);
      onFilesChange(updatedFiles, [], [files.find((file) => file.id === fileId)!]);
    },
    [files, onFilesChange]
  );

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return "file";
    if (fileType.startsWith("video/")) return "video";
    return "file-text";
  };

  const extensionsString = allowedExtensions.length > 0 ? allowedExtensions.join(",") : "any";

  const fileInstructionsText = isLocaleReady
    ? t("file_upload_instructions", {
        types: extensionsString,
        maxSize: formatFileSize(maxFileSize),
      })
    : `Accepted types: ${extensionsString}; Max file size: ${formatFileSize(maxFileSize)}`;
  const buttonText = buttonMsg ? buttonMsg : isLocaleReady ? t("add_files") : defaultT["add_files"];

  return (
    <div>
      <div className="stack-y-3">
        <div className="flex items-center gap-2">
          <Label
            htmlFor={id}
            className={`mb-0 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              disabled ? "cursor-not-allowed opacity-50" : ""
            }`}>
            <Icon name="upload" className="h-4 w-4" />
            {buttonText}
          </Label>
          <div className="flex items-center">
            <Input
              id={id}
              type="file"
              multiple={multiple}
              accept={allowedTypes.join(",")}
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              disabled={disabled}
              className="hidden"
              data-testid={testId}
            />
            {files.length > 0 && (
              <span className="text-sm">
                {files.length}/{maxFiles} files
              </span>
            )}
          </div>
        </div>
      </div>
      {showFilesList && files.length > 0 && (
        <div className="mt-2 stack-y-1 transition">
          {files.map((fileData) => (
            <div key={fileData.id} className="flex items-center justify-between rounded-md border">
              <div className="flex min-w-0 items-center gap-2 pl-2">
                <Icon name={getFileIcon(fileData.file.type)} className="h-5 w-5 shrink-0" />
                <div className="min-w-0 border-l py-2 pl-3">
                  <p className="text-emphasis truncate text-sm font-medium">{fileData.file.name}</p>
                  <p className="text-xs">{formatFileSize(fileData.file.size)}</p>
                </div>
              </div>
              <Button
                variant="icon"
                color="destructive"
                size="sm"
                StartIcon="x"
                onClick={() => handleFileRemove(fileData.id)}
                className="mx-2 h-6 w-6 shrink-0"
              />
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs">{fileInstructionsText}</p>
    </div>
  );
}
