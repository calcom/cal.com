import * as SliderPrimitive from "@radix-ui/react-slider";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type ReadAsMethod = "readAsText" | "readAsDataURL" | "readAsArrayBuffer" | "readAsBinaryString";

type UseFileReaderProps = {
  method: ReadAsMethod;
  onLoad?: (result: unknown) => void;
};

export const useFileReader = (options: UseFileReaderProps) => {
  const { method = "readAsText", onLoad } = options;
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<DOMException | null>(null);
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
    reader.onerror = () => setError(reader.error);

    reader.onload = (e: ProgressEvent<FileReader>) => {
      setResult(e.target?.result ?? null);
      if (onLoad) {
        onLoad(e.target?.result ?? null);
      }
    };
    reader[method](file);
  }, [file, method, onLoad]);

  return [{ result, error, file, loading }, setFile] as const;
};

export const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous"); // needed to avoid cross-origin issues on CodeSandbox
    image.src = url;
  });

export const Slider = ({
  value,
  label,
  changeHandler,
  ...props
}: Omit<SliderPrimitive.SliderProps, "value"> & {
  value: number;
  label: string;
  changeHandler: (value: number) => void;
}) => (
  <SliderPrimitive.Root
    className="slider mt-2"
    value={[value]}
    aria-label={label}
    onValueChange={(value: number[]) => changeHandler(value[0] ?? value)}
    {...props}>
    <SliderPrimitive.Track className="slider-track">
      <SliderPrimitive.Range className="slider-range" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="slider-thumb" />
  </SliderPrimitive.Root>
);

export interface FileEvent<T = Element> extends FormEvent<T> {
  target: EventTarget & T;
}

export type Area = {
  width: number;
  height: number;
  x: number;
  y: number;
};
