import { useEffect, useState } from "react";

type ReadAsMethod = "readAsText" | "readAsDataURL" | "readAsArrayBuffer" | "readAsBinaryString";

type UseFileReaderProps = {
  method: ReadAsMethod;
  onLoad?: (result: unknown) => void;
};

export const useFileReader = (options: UseFileReaderProps) => {
  const { method = "readAsText", onLoad } = options;
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<ProgressEvent<FileReader> | null>(null);
  const [result, setResult] = useState<string | ArrayBuffer | null>(null);

  useEffect(() => {
    if (!file && result) {
      setResult(null);
    }
  }, [file, result]);

  useEffect(() => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadstart = () => setLoading(true);
    reader.onloadend = () => setLoading(false);
    reader.onerror = setError;

    reader.onload = (e) => {
      setResult(e.target.result);
      if (onLoad) {
        onLoad(e.target.result);
      }
    };

    try {
      reader[method](file);
    } catch (e) {
      setError(e);
    }
  }, [file, method, onLoad]);

  return [{ result, error, file, loading }, setFile];
};
