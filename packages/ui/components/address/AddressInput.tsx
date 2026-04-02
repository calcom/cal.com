import cx from "@calcom/ui/classNames";
import { Input } from "../form";
import { Icon } from "../icon";

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
      <Icon
        name="map-pin"
        className="text-muted absolute left-0.5 ml-3 h-4 w-4 -translate-y-1/2"
        style={{ top: "44%" }}
      />
      <Input
        {...rest}
        autoComplete="address-line1"
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
