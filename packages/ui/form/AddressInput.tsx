import { FiMapPin } from "../components/icon";

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
      <FiMapPin color="#D2D2D2" className="absolute top-1/2 left-0.5 ml-3 h-6 -translate-y-1/2" />
      <input
        {...rest}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        color="#D2D2D2"
        className={`${className} focus-within:border-brand-default dark:bg-darkgray-100 dark:border-darkgray-300 border-default disabled:text-subtle disabled:dark:text-subtle dark:text-inverted block  h-10 w-full rounded-md border border py-px pl-10 text-sm outline-none ring-black focus-within:ring-1 disabled:opacity-50 dark:placeholder-gray-500 dark:selection:bg-green-500`}
      />
    </div>
  );
}

export default AddressInput;
