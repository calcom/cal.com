import { User } from "@prisma/client";
import Image from "next/image";

import classNames from "@lib/classNames";

export type AvatarProps = {
  user: Pick<User, "name" | "username" | "avatar"> & { emailMd5?: string };
  className?: string;
  size?: number;
  title?: string;
  width?: number;
  height?: number;
  alt: string;
};

// defaultAvatarSrc from profile.tsx can't be used as it imports crypto
function defaultAvatarSrc(md5: string) {
  return `https://www.gravatar.com/avatar/${md5}?s=160&d=identicon&r=PG`;
}

// An SSR Supported version of Avatar component.
// FIXME: title support is missing
export function AvatarSSR(props: AvatarProps) {
  const { user, size, width, height } = props;
  const nameOrUsername = user.name || user.username || "";
  const className = classNames("rounded-full", props.className, size && `h-${size} w-${size}`);
  let imgSrc;
  const alt = props.alt || nameOrUsername;
  if (user.avatar) {
    imgSrc = user.avatar;
  } else if (user.emailMd5) {
    imgSrc = defaultAvatarSrc(user.emailMd5);
  }
  return imgSrc ? (
    <Image alt={alt} className={className} src={imgSrc} layout="fixed" width={width} height={height} />
  ) : null;
}
