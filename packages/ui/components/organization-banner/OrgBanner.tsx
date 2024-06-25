import Image from "next/image";

import classNames from "@calcom/lib/classNames";

export type OrgBannerProps = {
  className?: string;
  imageSrc?: string;
  alt: string;
  fallback?: React.ReactNode;
  "data-testid"?: string;
};

export function OrgBanner(props: OrgBannerProps) {
  const { imageSrc, alt } = props;

  if (!imageSrc) {
    return <div className={classNames("bg-muted", props.className)}>{props.fallback}</div>;
  }
  return <Image data-testid={props?.["data-testid"]} src={imageSrc} alt={alt} className={props.className} />;
}
