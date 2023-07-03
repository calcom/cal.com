interface AppThemeLabelProps {
  page: string;
  defaultChecked?: boolean;
  value: "light" | "dark" | null;
  themeType: "Light" | "Dark" | "System Default";
  register: any;
}

export default function AppThemeLabel(props: AppThemeLabelProps) {
  return (
    <label
      className="relative mb-4 flex-1 cursor-pointer text-center last:mb-0 last:mr-0 sm:mb-0 sm:mr-4"
      htmlFor={`theme-${props.themeType}`}>
      <input
        className="peer absolute left-8 top-8"
        defaultChecked={props.defaultChecked}
        id={`theme-${props.themeType}`}
        name="appTheme"
        type="radio"
        value={props.value}
        {...props.register("appTheme")}
      />
      <div className="ring-inverted relative z-10 rounded-lg ring-offset-2 transition-all peer-checked:ring-2">
        <img
          aria-hidden="true"
          className="cover w-full rounded-lg"
          src={`/appTheme-${props.themeType}.svg`}
          alt={`theme ${props.themeType}`}
        />
      </div>
      <p className="peer-checked:text-emphasis text-default mt-2 text-sm font-medium">{props.themeType}</p>
    </label>
  );
}
