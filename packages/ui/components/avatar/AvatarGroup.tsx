import classNames from "@calcom/ui/classNames";
import { Avatar } from "./Avatar";

export type AvatarGroupProps = {
  size: "sm" | "lg";
  items: {
    image: string;
    title?: string;
    alt?: string;
    href?: string | null;
  }[];
  className?: string;
  truncateAfter?: number;
  hideTruncatedAvatarsCount?: boolean;
};

export const AvatarGroup = function AvatarGroup(props: AvatarGroupProps) {
  const LENGTH = props.items.length;
  const truncateAfter = props.truncateAfter || 4;
  /**
   * First, filter all the avatars object that have image
   * Then, slice it until before `truncateAfter` index
   */
  const displayedAvatars = props.items.filter((avatar) => avatar.image).slice(0, truncateAfter);
  const numTruncatedAvatars = LENGTH - displayedAvatars.length;

  if (!displayedAvatars.length) return <></>;

  return (
    <ul className={classNames("flex items-center", props.className)}>
      {displayedAvatars.map((item, idx) => (
        <li key={idx} className="-mr-1 inline-block">
          <Avatar
            data-testid="avatar"
            className="border-subtle"
            imageSrc={item.image}
            title={item.title}
            alt={item.alt || ""}
            size={props.size}
            href={item.href}
          />
        </li>
      ))}
      {numTruncatedAvatars > 0 && (
        <li
          className={classNames(
            "bg-inverted relative -mr-1 inline-flex justify-center  overflow-hidden rounded-full",
            props.size === "sm" ? "min-w-6 h-6" : "min-w-16 h-16"
          )}>
          <span
            className={classNames(
              " text-inverted m-auto flex h-full w-full items-center justify-center text-center",
              props.size === "sm" ? "text-[12px]" : "text-2xl"
            )}>
            +{props.hideTruncatedAvatarsCount ? null : numTruncatedAvatars}
          </span>
        </li>
      )}
    </ul>
  );
};
