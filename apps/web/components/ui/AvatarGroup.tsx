import Link from "next/link";
import React from "react";

import classNames from "@lib/classNames";

import { AvatarSSR } from "@components/ui/AvatarSSR";

export type AvatarGroupProps = {
  border?: string; // this needs to be the color of the parent container background, i.e.: border-white dark:border-gray-900
  size: number;
  truncateAfter?: number;
  items: {
    image: string;
    title?: string;
    alt?: string;
    href?: string;
  }[];
  className?: string;
};

export const AvatarGroup = function AvatarGroup(props: AvatarGroupProps) {
  return (
    <ul className={classNames(props.className)}>
      {props.items.slice(0, props.truncateAfter).map((item, idx) => {
        if (item.image != null) {
          const avatar = (
            <AvatarSSR
              className={props.border}
              imageSrc={item.image}
              title={item.title}
              alt={item.alt || ""}
              size={props.size}
            />
          );

          return (
            <li key={idx} className="-ltr:mr-2 inline-block rtl:ml-2">
              {item.href ? <Link href={item.href}>{avatar}</Link> : avatar}
            </li>
          );
        }
      })}
    </ul>
  );
};

export default AvatarGroup;
