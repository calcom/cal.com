/// <reference types="react" />
export type AddressInputProps = {
    value: string;
    id?: string;
    placeholder?: string;
    required?: boolean;
    onChange: (val: string) => void;
    className?: string;
};
declare function AddressInput({ value, onChange, ...rest }: AddressInputProps): JSX.Element;
export default AddressInput;
//# sourceMappingURL=AddressInput.d.ts.map