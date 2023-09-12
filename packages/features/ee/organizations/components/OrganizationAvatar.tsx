import classNames from "@calcom/lib/classNames";
import { Avatar } from "@calcom/ui";
import type { AvatarProps } from "@calcom/ui";

type OrganizationAvatarProps = AvatarProps & {
  organizationSlug: string | null | undefined;
};

const OrganizationAvatar = ({ size, imageSrc, alt, organizationSlug, ...rest }: OrganizationAvatarProps) => {
  return (
    <Avatar
      size={size}
      imageSrc={imageSrc}
      alt={alt}
      indicator={
        organizationSlug ? (
          <div
            className={classNames("absolute bottom-0 right-0 z-10", size === "lg" ? "h-6 w-6" : "h-10 w-10")}>
            <img
              src={`/org/${organizationSlug}/avatar.png`}
              alt={alt}
              className="flex h-full items-center justify-center rounded-full ring-2 ring-white"
            />
          </div>
        ) : null
      }
    />
  );
};

export default OrganizationAvatar;
