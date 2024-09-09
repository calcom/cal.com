/// <reference types="react" />
import "react-phone-input-2/lib/style.css";
export type PhoneInputProps = {
    value?: string;
    id?: string;
    placeholder?: string;
    required?: boolean;
    className?: string;
    name?: string;
    disabled?: boolean;
    onChange: (value: string) => void;
};
declare function BasePhoneInput({ name, className, onChange, value, ...rest }: PhoneInputProps): JSX.Element;
export default BasePhoneInput;
//# sourceMappingURL=PhoneInput.d.ts.map