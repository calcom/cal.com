import { Input } from "../components/form/inputs/Input";
import { MapPin } from "../components/icon";

export type AddressInputProps = {
  value: string;
  id?: string;
  placeholder?: string;
  required?: boolean;
  onChange: (val: string) => void;
  className?: string;
};

function AddressInput({ className = "", value, onChange, ...rest }: AddressInputProps) {
  return (
    <div className="relative ">
      <MapPin className="text-emphasis absolute top-1/2 left-0.5 ml-3 h-4 -translate-y-1/2" />
      <Input
        {...rest}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className={`${className} py-px pl-10`}
      />
    </div>
  );
}

export default AddressInput;
