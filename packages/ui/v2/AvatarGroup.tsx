import classNames from "@calcom/lib/classNames";

import Avatar from "./Avatar";

export type AvatarGroupProps = {
  size: "sm" | "lg";
  items: {
    image: string;
    title?: string;
    alt?: string;
  }[];
  className?: string;
  accepted?: boolean;
};

export const AvatarGroup = function AvatarGroup(props: AvatarGroupProps) {
  const avatars = props.items.slice(0, 4);
  const LENGTH = props.items.length;

  return (
    <ul className={classNames(props.className)}>
      {avatars.map((item, enumerator) => {
        if (item.image != null) {
          if (LENGTH > 4 && enumerator === 3) {
            return (
              <li key={enumerator} className="relative -mr-4 inline-block ">
                <div className="relative overflow-hidden">
                  <Avatar
                    className="h-90 relative min-w-full scale-105 transform border-gray-200 object-cover blur filter"
                    imageSrc={item.image}
                    alt={item.alt || ""}
                    size={props.size}
                  />
                </div>
                <div
                  className={classNames(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white",
                    props.size === "sm" ? "text-base" : "text-2xl"
                  )}>
                  <span>+{LENGTH - 3}</span>
                </div>
              </li>
            );
          }
          // Always display the first Four items items
          return (
            <li key={enumerator} className="-mr-4 inline-block">
              <Avatar
                className="border-gray-200"
                imageSrc={item.image}
                title={item.title}
                alt={item.alt || ""}
                accepted={props.accepted}
                size={props.size}
              />
            </li>
          );
        }
      })}
    </ul>
  );
};

export default AvatarGroup;
