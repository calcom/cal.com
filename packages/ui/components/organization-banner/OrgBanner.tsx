import Image from "next/image";

import classNames from "@calcom/lib/classNames";

export type OrgBannerProps = {
  alt: string;
  width?: number;
  height?: number;
  imageSrc?: string;
  fallback?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
};

export function OrgBanner(props: OrgBannerProps) {
  const { imageSrc, alt, width = 1500, height = 500 } = props;

  if (!imageSrc) {
    return <div className={classNames("bg-muted", props.className)}>{props.fallback}</div>;
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
