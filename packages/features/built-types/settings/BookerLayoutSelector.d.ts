/// <reference types="react" />
type BookerLayoutSelectorProps = {
    title?: string;
    description?: string;
    name?: string;
    /**
     * If this boolean is set, it will show the user settings if the event does not have any settings (is null).
     * In that case it also will NOT register itself in the form, so that way when submitting the form, the
     * values won't be overridden. Because as long as the event's value is null, it will fallback to the user's
     * settings.
     */
    fallbackToUserSettings?: boolean;
    /**
     * isDark boolean should be passed in when the user selected 'dark mode' in the theme settings in profile/appearance.
     * So it's not based on the user's system settings, but on the user's preference for the booker.
     * This boolean is then used to show a dark version of the layout image. It's only easthetic, no functionality is attached
     * to this boolean.
     */
    isDark?: boolean;
    isLoading?: boolean;
    isDisabled?: boolean;
    isOuterBorder?: boolean;
};
export declare const BookerLayoutSelector: ({ title, description, name, fallbackToUserSettings, isDark, isDisabled, isOuterBorder, isLoading, }: BookerLayoutSelectorProps) => JSX.Element;
export {};
//# sourceMappingURL=BookerLayoutSelector.d.ts.map