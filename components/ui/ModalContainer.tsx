import classNames from "classnames";
import React from "react";

interface Props extends React.PropsWithChildren<any> {
  wide?: boolean;
  scroll?: boolean;
  noPadding?: boolean;
}

export default function ModalContainer(props: Props) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true">
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 z-0 transition-opacity bg-gray-500 bg-opacity-75"
          aria-hidden="true"></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>
        <div
          className={classNames(
            "inline-block min-w-96 px-4 pt-5 pb-4 text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6",
            {
              "sm:max-w-lg sm:w-full ": !props.wide,
              "sm:max-w-4xl sm:w-4xl": props.wide,
              "overflow-scroll": props.scroll,
              "!p-0": props.noPadding,
            }
          )}>
          {props.children}
        </div>
      </div>
    </div>
  );
}
