interface ThemeLabelProps {
  variant: "light" | "dark" | "system";
  value?: "light" | "dark" | null;
  label: string;
  defaultChecked?: boolean;
  register: any;
}

export default function ThemeLabel(props: ThemeLabelProps) {
  const { variant, label, value, defaultChecked, register } = props;

  return (
    <label
      className="relative mb-4 flex-1 cursor-pointer text-center last:mb-0 last:mr-0 sm:mr-4 sm:mb-0"
      htmlFor={`theme-${variant}`}>
      <input
        className="peer absolute top-8 left-8"
        type="radio"
        value={value}
        id={`theme-${variant}`}
        defaultChecked={defaultChecked}
        {...register("theme")}
      />
      <div className="relative z-10 rounded-lg ring-black transition-all peer-checked:ring-2">
        <img
          aria-hidden="true"
          className="cover w-full rounded-lg"
          src={`/theme-${variant}.svg`}
          alt={`theme ${variant}`}
        />
      </div>
      <p className="mt-2 text-sm font-medium text-gray-600 peer-checked:text-gray-900">{label}</p>
    </label>
  );
}
