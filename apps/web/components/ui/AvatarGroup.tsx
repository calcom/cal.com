import React from "react";

import classNames from "@lib/classNames";

import Avatar from "@components/ui/Avatar";

export type AvatarGroupProps = {
  size: number;
  truncateAfter?: number;
  items: {
    image: string;
    title?: string;
    alt?: string;
  }[];
  className?: string;
};

export const AvatarGroup = function AvatarGroup(props: AvatarGroupProps) {
  return (
    <ul className={classNames(props.className)}>
      {props.items.slice(0, props.truncateAfter).map((item, idx) => {
        if (item.image != null) {
          return (
            <li key={idx} className="-mr-3 inline-block">
              <Avatar imageSrc={item.image} title={item.title} alt={item.alt || ""} size={props.size} />
            </li>
          );
        }
      })}
    </ul>
  );
};

export default AvatarGroup;
