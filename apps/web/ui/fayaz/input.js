import clsx from "clsx";

export default function Input({
  label,
  type = "text",
  id,
  name,
  placeholder,
  Icon,
  disabled,
  className,
  ...props
}) {
  return (
    <div className={clsx("flex-1 space-y-1", className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium leading-6 text-gray-900">
          {label}
        </label>
      )}
      <div className="relative rounded-md shadow-sm">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
        )}
        <input
          disabled={disabled}
          type={type}
          name={name}
          id={id}
          className={clsx(
            "block w-full rounded-md border-0 py-1.5",
            Icon ? "pl-10" : "pl-3",
            disabled ? "cursor-not-allowed opacity-50" : "bg-white",
            "text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          )}
          placeholder={placeholder}
          {...props}
        />
      </div>
    </div>
  );
}
