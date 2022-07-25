import React from "react";

import BaseIcon from "@components/ui/icons/BaseIcon";

export default function ItalicIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <path
        fillRule="evenodd"
        d="M6 2.75A.75.75 0 016.75 2h6.5a.75.75 0 010 1.5h-2.505l-3.858 9H9.25a.75.75 0 010 1.5h-6.5a.75.75 0 010-1.5h2.505l3.858-9H6.75A.75.75 0 016 2.75z"></path>
    </BaseIcon>
  );
}
