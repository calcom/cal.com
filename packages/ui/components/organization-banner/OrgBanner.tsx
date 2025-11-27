import Image from "next/image";

import classNames from "@calcom/ui/classNames";

type Maybe<T> = T | null | undefined;

export type OrgBannerProps = {
  alt: string;
  width?: number;
  height?: number;
  imageSrc?: Maybe<string>;
  fallback?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
};

export function OrgBanner(props: OrgBannerProps) {
  const { imageSrc, alt, width = 1500, height = 500 } = props;

  if (!imageSrc) {
    return <div className={classNames("bg-cal-muted", props.className)}>{props.fallback}</div>;
  }
  return (
    <Image
      data-testid={props?.["data-testid"]}
      src={imageSrc}
      alt={alt}
      className={props.className}
      width={width}
      height={height}
    />
  );
}
