"use client";

import { type PropsWithChildren, useState } from "react";

import className from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";

type Props = {
  customCodeSnippet?: string;
  className?: string;
};

export const RenderComponentWithSnippet: React.FC<PropsWithChildren<Props>> = (props) => {
  const [open, setOpen] = useState(false);
  // const snippet =
  //   props.customCodeSnippet ??
  //   reactElementToJSXString(props.children, {
  //     showFunctions: true,
  //     useBooleanShorthandSyntax: true,

  //     displayName: (node) => {
  //       // @ts-ignore
  //       return node?.type.displayName ?? node?.type ?? "Unknown";
  //     },
  //   });
  return (
    <div className="border-gray-6 bg-default rounded-lg border">
      <div className={className("not-prose p-8 xl:p-12", props.className)}>{props.children}</div>

      <div className="bg-gray-3 border-gray-6 flex items-center justify-start  border-b border-t p-2">
        <Button
          color="minimal"
          onClick={() => {
            setOpen(!open);
          }}>
          Code (WIP)
        </Button>
      </div>

      <div
        className={className(
          "bg-gray-2  max-h-96 w-full overflow-y-scroll transition-all",
          open ? "block" : "hidden"
        )}>
        <div className="flex items-start">
          {/* <pre className="py-0 text-gray-8 text-right">
            {snippet
              .split("\n")
              .map((_line, i) => i + 1)
              .join("\n")}
          </pre>
          <pre className="py-0 text-gray-12 w-full">{snippet}</pre> */}
        </div>
      </div>
    </div>
  );
};
