import type { PropsWithChildren } from "react";

type Props = {
  name: string;
};
export const Icon: React.FC<PropsWithChildren<Props>> = (props) => {
  return (
    <div className="text-gray-12 flex flex-col items-center justify-center gap-4">
      <div className="size-12 border-gray-5 bg-gray-3  flex aspect-square items-center justify-center rounded-lg border ">
        {props.children}
      </div>
      <span className="font-mono text-sm">
        {"<"}
        {props.name}
        {"/>"}
      </span>
    </div>
  );
};

Icon.displayName = "Icon";
