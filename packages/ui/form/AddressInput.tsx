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
        className={`${className} focus-within:border-brand dark:bg-darkgray-100 dark:border-darkgray-300 block h-10 w-full rounded-md border  border border-gray-300 py-px pl-10 text-sm outline-none ring-black focus-within:ring-1 disabled:text-gray-500 disabled:opacity-50 dark:text-white dark:placeholder-gray-500 dark:selection:bg-green-500 disabled:dark:text-gray-500`}
      />
    </div>
  );
}

export default AddressInput;
