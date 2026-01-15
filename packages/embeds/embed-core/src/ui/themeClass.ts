import { EMBED_DARK_THEME_CLASS, EMBED_LIGHT_THEME_CLASS } from "../constants";

export type ExternalThemeClass = typeof EMBED_DARK_THEME_CLASS | typeof EMBED_LIGHT_THEME_CLASS
export type InternalThemeClass = "dark" | "light"

export function getInternalThemeClass(externalThemeClass: ExternalThemeClass): InternalThemeClass {
    return externalThemeClass === EMBED_DARK_THEME_CLASS ? "dark" : "light";
}