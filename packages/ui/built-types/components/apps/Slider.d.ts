/// <reference types="react" />
/// <reference types="glidejs__glide" />
import type { Options } from "@glidejs/glide";
import "@glidejs/glide/dist/css/glide.core.min.css";
import "@glidejs/glide/dist/css/glide.theme.min.css";
export declare const Slider: <T extends unknown>({ title, className, items, itemKey, renderItem, options, }: {
    title?: string | undefined;
    className?: string | undefined;
    items: T[];
    itemKey?: ((item: T) => string) | undefined;
    renderItem?: ((item: T) => JSX.Element) | undefined;
    options?: Options | undefined;
}) => JSX.Element;
//# sourceMappingURL=Slider.d.ts.map