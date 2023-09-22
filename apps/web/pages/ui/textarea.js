const Textarea = (props) => {
  return (
    <div className="w-full">
      {props?.label ? (
        <label className="mb-px flex text-sm font-semibold dark:text-white">{props?.label}</label>
      ) : (
        ""
      )}
      <textarea
        {...props}
        type={props.type || "text"}
        className={
          "my-1 w-full resize-none rounded-lg border border-gray-200 px-4 py-[12px] shadow outline-none hover:border-gray-400 focus:border-gray-600 " +
          (props.className ? props.className : "")
        }
      />
      {props.error && (
        <div className="flex items-center text-sm font-semibold text-red-400">
          <i className="ri-error-warning-line mr-1" />
          {props.error}
        </div>
      )}
    </div>
  );
};

export default Textarea;
