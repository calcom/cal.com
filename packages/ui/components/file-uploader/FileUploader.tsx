"use client";

import { useCallback, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button } from "../button";
import { Icon } from "../icon";
import { showToast } from "../toast";

export interface FileData {
  file: File;
  dataUrl: string;
  id: string;
}

interface FileUploaderProps {
  id: string;
  buttonMsg: string;
  onFilesChange: (files: FileData[]) => void;
  acceptedFileTypes?: string;
  maxFiles?: number;
  maxFileSize?: number;
  disabled?: boolean;
  testId?: string;
}

export default function FileUploader({
  id,
  buttonMsg,
  onFilesChange,
  acceptedFileTypes = "image/*,video/*",
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024,
  disabled = false,
  testId,
}: FileUploaderProps) {
  const { t } = useLocale();
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

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return t("file_size_limit_exceed");
    }

    const acceptedTypes = acceptedFileTypes.split(",").map((type) => type.trim());
    const isValidType = acceptedTypes.some((type) => {
      if (type.endsWith("/*")) {
        const baseType = type.slice(0, -2);
        return file.type.startsWith(baseType);
      }
      return file.type === type;
    });

    if (!isValidType) {
      return t("invalid_file_type");
    }

    return null;
  };

  const handleFileSelect = useCallback(
    async (selectedFiles: FileList) => {
      const newFiles: FileData[] = [];
      const errors: string[] = [];

      if (files.length + selectedFiles.length > maxFiles) {
        showToast(t("max_files_exceeded", { max: maxFiles }), "error");
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
        onFilesChange(updatedFiles);
        showToast(t("files_uploaded_successfully", { count: newFiles.length }), "success");
      }
    },
    [files, maxFiles, maxFileSize, acceptedFileTypes, onFilesChange, t]
  );

  const handleFileRemove = useCallback(
    (fileId: string) => {
      const updatedFiles = files.filter((file) => file.id !== fileId);
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
    },
    [files, onFilesChange]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return "file";
    if (fileType.startsWith("video/")) return "video";
    return "file-text";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label
          htmlFor={id}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            disabled ? "cursor-not-allowed opacity-50" : ""
          }`}>
          <Icon name="upload" className="h-4 w-4" />
          {buttonMsg}
        </label>
        <input
          id={id}
          type="file"
          multiple
          accept={acceptedFileTypes}
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          disabled={disabled}
          className="hidden"
          data-testid={testId}
        />
        {files.length > 0 && (
          <span className="text-sm text-gray-500">
            {files.length}/{maxFiles} files
          </span>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileData) => (
            <div
              key={fileData.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-2">
              <div className="flex items-center gap-2">
                <Icon name={getFileIcon(fileData.file.type)} className="h-4 w-4 text-gray-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{fileData.file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(fileData.file.size)}</p>
                </div>
              </div>
              <Button
                variant="icon"
                size="sm"
                onClick={() => handleFileRemove(fileData.id)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-500">
                <Icon name="x" className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        {t("file_upload_instructions", {
          types: acceptedFileTypes.replace(/\*/g, ""),
          maxSize: formatFileSize(maxFileSize),
          maxFiles,
        })}
      </p>
    </div>
  );
}
