/// <reference types="react" />
interface ThemeLabelProps {
    variant: "light" | "dark" | "system";
    value?: "light" | "dark" | null;
    label: string;
    defaultChecked?: boolean;
    register: any;
    fieldName?: string;
}
export default function ThemeLabel(props: ThemeLabelProps): JSX.Element;
export {};
//# sourceMappingURL=ThemeLabel.d.ts.map