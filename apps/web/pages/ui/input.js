import clsx from "clsx";

export default function Input(props) {
  return (
    <div className="w-full">
      {props?.label ? (
        <label className="mb-px flex text-sm font-semibold dark:text-white">{props?.label}</label>
      ) : (
        ""
      )}
      <input
        {...props}
        type={props.type || "text"}
        className={clsx(
          "my-1 w-full rounded-lg border border-gray-200 px-3 py-[12px] shadow outline-none duration-200 hover:border-gray-400 focus:border-gray-400",
          props.className,
          props?.disabled ? "opacity-60" : ""
        )}
        ref={(el) => {
          if (props.passref) {
            props.passref.current = el;
          }
        }}
      />
      {props.error && (
        <div className="flex items-center text-sm font-semibold text-red-400">
          <i className="ri-error-warning-line mr-1" />
          {props.error}
        </div>
      )}
    </div>
  );
}
