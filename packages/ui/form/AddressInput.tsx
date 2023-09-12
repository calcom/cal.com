import cx from "@calcom/lib/classNames";

import { Input } from "../components/form";
import { MapPin } from "../components/icon";

export type AddressInputProps = {
  value: string;
  id?: string;
  placeholder?: string;
  required?: boolean;
  onChange: (val: string) => void;
  className?: string;
};

function AddressInput({ value, onChange, ...rest }: AddressInputProps) {
  return (
    <div className="relative flex items-center">
      <MapPin className="text-muted absolute left-0.5 ml-3 h-4 w-4 -translate-y-1/2" style={{ top: "44%" }} />
      <Input
        {...rest}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className={cx("pl-10", rest?.className)}
      />
    </div>
  );
}

export default AddressInput;
