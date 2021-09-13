import React from "react";
import Avatar from "@components/ui/Avatar";
import classNames from "@lib/classNames";
import * as Tooltip from "@radix-ui/react-tooltip";

export type AvatarGroupProps = {
  size: number;
  truncateAfter?: number;
  items: {
    image: string;
    title?: string;
    alt: string;
  }[];
  className?: string;
};

export const AvatarGroup = function AvatarGroup(props: AvatarGroupProps) {
  const truncatedAvatars: string[] =
    props.items.length > props.truncateAfter
      ? props.items
          .slice(props.truncateAfter)
          .map((item) => item.title)
          .filter(Boolean)
      : [];

  return (
    <ul className={classNames("flex -space-x-2 overflow-hidden", props.className)}>
      {props.items.slice(0, props.truncateAfter).map((item, idx) => (
        <li key={idx} className="inline-block">
          <Avatar imageSrc={item.image} title={item.title} alt={item.alt} size={props.size} />
        </li>
      ))}
      {props.items.length > props.truncateAfter && (
        <li>
          <Tooltip.Tooltip delayDuration="300">
            <Tooltip.TooltipTrigger
              className={`w-${props.size} h-${props.size} cursor-default bg-neutral-700 border-2 border-gray-300 rounded-full`}>
              <div className="flex justify-center items-center">
                <span
                  className={classNames(
                    "text-gray-400",
                    props.size > 6 && props.size < 12 && "text-sm",
                    props.size > 11 && "text-2xl font-semibold -mt-1 -ml-1 text-gray-500"
                  )}>
                  +{props.items.length - props.truncateAfter}
                </span>
              </div>
            </Tooltip.TooltipTrigger>
            {truncatedAvatars.length !== 0 && (
              <Tooltip.Content className="p-2 rounded-sm text-sm bg-black text-white shadow-sm">
                <Tooltip.Arrow />
                <ul>
                  {truncatedAvatars.map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>
              </Tooltip.Content>
            )}
          </Tooltip.Tooltip>
        </li>
      )}
    </ul>
  );
};

export default AvatarGroup;
