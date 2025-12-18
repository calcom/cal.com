"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button } from "../button";
import { Icon } from "../icon/Icon";
import { Input } from "../input/input";
import { triggerToast } from "../toast";

export interface FileData {
  file: File;
  dataUrl: string;
  id: string;
}

interface AttachmentUploaderProps {
  id: string;
  onFilesChange: (allFiles: FileData[], newFiles: FileData[], removedFiles: FileData[]) => void;
  acceptedFileTypes?: TAcceptedFileTypes[];
  maxAllowedFiles?: number;
  maxFileSize?: number;
  disabled?: boolean;
  testId?: string;
}

type TAcceptedFileTypes = "images" | "csv" | "documents";

const acceptFileTypes: Record<TAcceptedFileTypes, { types: string[]; extensions: string[] }> = {
  images: {
    types: ["image/png", "image/jpeg"],
    extensions: [".png", ".jpg", ".jpeg"],
  },
  csv: {
    types: ["text/csv"],
    extensions: [".csv"],
  },
  documents: {
    types: [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ],
    extensions: [".pdf", ".txt", ".doc", ".docx", ".xls", ".xlsx", ".csv"],
  },
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const defaultAcceptedFileTypes = ["images", "csv", "documents"] as TAcceptedFileTypes[];

const MAX_TOTAL_BYTES = 1 * 1024 * 1024;

export default function AttachmentUploader({
  id,
  onFilesChange,
  acceptedFileTypes = defaultAcceptedFileTypes,
  maxFileSize = MAX_TOTAL_BYTES,
  maxAllowedFiles = 1,
  disabled,
  testId,
}: AttachmentUploaderProps) {
  const { t } = useLocale();
  const [files, setFiles] = useState<FileData[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const maxTotalSizeText = formatFileSize(MAX_TOTAL_BYTES);
  const maxSizeLabel = t("file_limit", { max: maxTotalSizeText });

  const fileTypes = useMemo<TAcceptedFileTypes[]>(
    () => acceptedFileTypes ?? defaultAcceptedFileTypes,
    [acceptedFileTypes]
  );

  const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const allowedTypes = useMemo(() => fileTypes.flatMap((type) => acceptFileTypes[type].types), [fileTypes]);
  const allowedExtensions = useMemo(
    () => fileTypes.flatMap((type) => acceptFileTypes[type].extensions),
    [fileTypes]
  );

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxFileSize) {
        return t("file_size_limit_exceed");
      }

      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        const extensionsString = allowedExtensions.join(",");
        return t("invalid_file_type_with_extensions", { extensions: extensionsString });
      }

      return null;
    },
    [allowedExtensions, allowedTypes, maxFileSize, t]
  );

  const handleFileSelect = useCallback(
    async (selectedFiles: FileList) => {
      const newFiles: FileData[] = [];
      const errors: string[] = [];

      if (files.length + selectedFiles.length > maxAllowedFiles) {
        triggerToast(t("max_files_exceeded"), "error");
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

      const totalSize = [...files, ...newFiles].reduce((sum, f) => sum + f.file.size, 0);
      if (totalSize > MAX_TOTAL_BYTES) {
        errors.push(t("file_size_limit_exceed"));
        newFiles.length = 0;
      }

      if (errors.length > 0) {
        triggerToast(errors.join(", "), "error");
      }

      if (newFiles.length > 0) {
        const updatedFiles = [...files, ...newFiles];
        setFiles(updatedFiles);
        onFilesChange(updatedFiles, newFiles, []);
      }
    },
    [files, maxAllowedFiles, onFilesChange, t, validateFile]
  );

  const handleFileRemove = useCallback(
    (fileId: string) => {
      const removed = files.find((file) => file.id === fileId);
      const updatedFiles = files.filter((file) => file.id !== fileId);
      setFiles(updatedFiles);
      onFilesChange(updatedFiles, [], removed ? [removed] : []);
    },
    [files, onFilesChange]
  );

  const handleChooseFiles = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    const droppedFiles = event.dataTransfer.files;
    setIsDragging(false);

    if (droppedFiles && droppedFiles.length > 0) {
      void handleFileSelect(droppedFiles);
    }
  };

  const handleContainerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleChooseFiles();
    }
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleChooseFiles}
        onKeyDown={handleContainerKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-2 py-4 text-center transition ${
          disabled
            ? "border-border bg-muted text-default cursor-not-allowed"
            : isDragging
            ? "border-primary bg-primary/5"
            : "border-border/70 bg-muted/50 hover:border-primary/70"
        }`}>
        <Input
          ref={inputRef}
          id={id}
          type="file"
          multiple={false}
          accept={[...allowedTypes, ...allowedExtensions].join(",")}
          onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files && handleFileSelect(e.target.files)}
          disabled={disabled}
          className="hidden"
          data-testid={testId}
        />
        <div className="mb-1 flex flex-row items-center justify-center gap-2">
          <Icon name="upload" className="text-default h-4 w-4" />
          <p className="text-default text-sm">{t("drop_file_here_or")}</p>
        </div>
        <Button color="secondary" size="sm" type="button" disabled={disabled}>
          {t("choose_file")}
        </Button>
      </div>
      <p className="text-default mt-1 text-xs">{maxSizeLabel}</p>
      {files.length > 0 && (
        <div className="mt-2 space-y-1 transition">
          {files.map((fileData) => (
            <div key={fileData.id} className="flex items-center justify-between rounded-md border">
              <div className="flex min-w-0 items-center gap-2 pl-2">
                <Icon name="file-text" className="h-5 w-5 flex-shrink-0" />
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
                className="mx-2 h-6 w-6 flex-shrink-0"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
