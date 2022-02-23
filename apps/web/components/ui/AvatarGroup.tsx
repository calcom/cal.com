import React from "react";

import classNames from "@lib/classNames";

import Avatar from "@components/ui/Avatar";

export type AvatarGroupProps = {
  border?: string; // this needs to be the color of the parent container background, i.e.: border-white dark:border-gray-900
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
            <li key={idx} className={classNames("-mr-2 inline-block border-2", props.border)}>
              <Avatar imageSrc={item.image} title={item.title} alt={item.alt || ""} size={props.size} />
            </li>
          );
        }
      })}
    </ul>
  );
};

export default AvatarGroup;
