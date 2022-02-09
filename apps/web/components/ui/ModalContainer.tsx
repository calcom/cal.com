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
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 z-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"></div>
        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
          &#8203;
        </span>
        <div
          className={classNames(
            "min-w-96 inline-block transform rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:p-6 sm:align-middle",
            {
              "sm:w-full sm:max-w-lg ": !props.wide,
              "sm:w-4xl sm:max-w-4xl": props.wide,
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
