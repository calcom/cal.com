import { User } from "@prisma/client";

import classNames from "@lib/classNames";

const defaultAvatarSrc = function ({ md5 }: { md5?: string }) {
  if (!md5) return "";

  return `https://www.gravatar.com/avatar/${md5}?s=160&d=identicon&r=PG`;
};
export type AvatarProps = {
  user: Pick<User, "name" | "username" | "avatar"> & { emailMd5?: string };
  className?: string;
  size?: number;
  title?: string;
  alt: string;
};

// An SSR Supported version of Avatar component.
// FIXME: title support is missing
export function AvatarSSR(props: AvatarProps) {
  const { user, size } = props;
  const nameOrUsername = user.name || user.username || "";
  const className = classNames("rounded-full", props.className, size && `h-${size} w-${size}`);
  let imgSrc;
  const alt = props.alt || nameOrUsername;
  if (user.avatar) {
    imgSrc = user.avatar;
  } else if (user.emailMd5) {
    imgSrc = defaultAvatarSrc({ md5: user.emailMd5 });
  }
  return imgSrc ? <img alt={alt} className={className} src={imgSrc}></img> : null;
}
