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
  const avatars = props.items.slice(0, 4);
  const LENGTH = props.items.length;
  const truncateAfter = props.truncateAfter || 4;

  return (
    <ul className={classNames("flex items-center", props.className)}>
      {avatars.map((item, enumerator) => {
        if (item.image != null) {
          if (LENGTH > truncateAfter && enumerator === truncateAfter - 1) {
            return (
              <li key={enumerator} className="relative -mr-[4px] inline-block ">
                <div className="relative">
                  <div className="h-90 relative min-w-full scale-105 transform border-gray-200 ">
                    <Avatar className="" imageSrc={item.image} alt={item.alt || ""} size={props.size} />
                  </div>
                </div>
                <div
                  className={classNames(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white",
                    props.size === "sm" ? "text-base" : "text-2xl"
                  )}>
                  <span>+{LENGTH - truncateAfter - 1}</span>
                </div>
              </li>
            );
          }
          // Always display the first Four items items
          return (
            <li key={enumerator} className="-mr-[4px] inline-block">
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
          );
        }
      })}
    </ul>
  );
};
