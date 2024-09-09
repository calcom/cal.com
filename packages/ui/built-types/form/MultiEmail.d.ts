/// <reference types="react" />
interface MultiEmailProps {
    value: string[];
    readOnly: boolean;
    label: string;
    setValue: (value: string[]) => void;
    placeholder?: string;
}
declare function MultiEmail({ value, readOnly, label, setValue, placeholder }: MultiEmailProps): JSX.Element;
export default MultiEmail;
//# sourceMappingURL=MultiEmail.d.ts.map