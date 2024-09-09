import * as SliderPrimitive from "@radix-ui/react-slider";
import type { FormEvent } from "react";
type ReadAsMethod = "readAsText" | "readAsDataURL" | "readAsArrayBuffer" | "readAsBinaryString";
type UseFileReaderProps = {
    method: ReadAsMethod;
    onLoad?: (result: unknown) => void;
};
export declare const useFileReader: (options: UseFileReaderProps) => readonly [{
    readonly result: string | ArrayBuffer | null;
    readonly error: DOMException | null;
    readonly file: File | null;
    readonly loading: boolean;
}, import("react").Dispatch<import("react").SetStateAction<File | null>>];
export declare const createImage: (url: string) => Promise<HTMLImageElement>;
export declare const Slider: ({ value, label, changeHandler, ...props }: Omit<SliderPrimitive.SliderProps, "value"> & {
    value: number;
    label: string;
    changeHandler: (value: number) => void;
}) => JSX.Element;
export interface FileEvent<T = Element> extends FormEvent<T> {
    target: EventTarget & T;
}
export type Area = {
    width: number;
    height: number;
    x: number;
    y: number;
};
export {};
//# sourceMappingURL=Common.d.ts.map