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
    <>
      {/* mobile-view */}
      <ul className={classNames("flex md:hidden", props.className)}>
        {props.items.slice(0, 2).map((item, idx) => {
          if (item.image != null) {
            return (
              <li key={idx} className="-mr-2 inline-block">
                <Avatar
                  className={props.border}
                  imageSrc={item.image}
                  title={item.title}
                  alt={item.alt || ""}
                  size={props.size}
                />
              </li>
            );
          }
        })}
        <li className="-mr-2 inline-block">
          <button className="cursor-default">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gray-100 dark:border-gray-900">
              <p className="text-gray-800">+{props.items.length - 2}</p>
            </span>
          </button>
        </li>
      </ul>
      <ul className={classNames("hidden sm:block", props.className)}>
        {props.items.slice(0, props.truncateAfter).map((item, idx) => {
          if (item.image != null) {
            return (
              <li key={idx} className="-mr-2 inline-block">
                <Avatar
                  className={props.border}
                  imageSrc={item.image}
                  title={item.title}
                  alt={item.alt || ""}
                  size={props.size}
                />
              </li>
            );
          }
        })}
      </ul>
    </>
  );
};

export default AvatarGroup;
