import classNames from "@calcom/lib/classNames";

import { Avatar } from "./Avatar";

export type AvatarGroupProps = {
  size: "sm" | "lg";
  items: {
    image: string;
    title?: string;
    alt?: string;
    href?: string;
  }[];
  className?: string;
  accepted?: boolean;
  truncateAfter?: number;
};

export const AvatarGroup = function AvatarGroup(props: AvatarGroupProps) {
  const LENGTH = props.items.length;
  const truncateAfter = props.truncateAfter || 4;
  const displayedAvatars = props.items
    .filter((avatar) => avatar.image)
    .filter((_, idx) => idx < truncateAfter);
  const numTruncatedAvatars = LENGTH - displayedAvatars.length;

  return (
    <ul className={classNames("flex items-center", props.className)}>
      {displayedAvatars.map((item, idx) => (
        <li key={idx} className="-mr-[4px] inline-block">
          <Avatar
            className="border-gray-200"
            imageSrc={item.image}
            title={item.title}
            alt={item.alt || ""}
            accepted={props.accepted}
            size={props.size}
            href={item.href}
          />
        </li>
      ))}
      {numTruncatedAvatars > 0 && (
        <li
          className={classNames(
            "relative -mr-[4px] mb-1 inline-flex justify-center overflow-hidden rounded-full bg-black",
            props.size === "sm" ? "h-6 w-6" : "h-16 w-16"
          )}>
          <span
            className={classNames(
              "m-auto text-center text-white",
              props.size === "sm" ? "text-[12px]" : "text-2xl"
            )}>
            +{numTruncatedAvatars}
          </span>
        </li>
      )}
    </ul>
  );
};
