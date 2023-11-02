import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import Link from "next/link";

import classNames from "@calcom/lib/classNames";
import { AVATAR_FALLBACK } from "@calcom/lib/constants";

import type { Maybe } from "@trpc/server";

import { Tooltip } from "../tooltip";

export type AvatarProps = {
  className?: string;
  size?: "xxs" | "xs" | "xsm" | "sm" | "md" | "mdLg" | "lg" | "xl";
  imageSrc?: Maybe<string>;
  title?: string;
  alt: string;
  href?: string;
  fallback?: React.ReactNode;
  accepted?: boolean;
  asChild?: boolean; // Added to ignore the outer span on the fallback component - messes up styling
  indicator?: React.ReactNode;
  "data-testid"?: string;
};

const sizesPropsBySize = {
  xxs: "w-3.5 h-3.5 min-w-3.5 min-h-3.5", // 14px
  xs: "w-4 h-4 min-w-4 min-h-4 max-h-4", // 16px
  xsm: "w-5 h-5 min-w-5 min-h-5", // 20px
  sm: "w-6 h-6 min-w-6 min-h-6", // 24px
  md: "w-8 h-8 min-w-8 min-h-8", // 32px
  mdLg: "w-10 h-10 min-w-10 min-h-10", //40px
  lg: "w-16 h-16 min-w-16 min-h-16", // 64px
  xl: "w-24 h-24 min-w-24 min-h-24", // 96px
} as const;

export function Avatar(props: AvatarProps) {
  const { imageSrc, size = "md", alt, title, href, indicator } = props;
  const rootClass = classNames("aspect-square rounded-full", sizesPropsBySize[size]);
  let avatar = (
    <AvatarPrimitive.Root
      data-testid={props?.["data-testid"]}
      className={classNames(
        "bg-emphasis item-center relative inline-flex aspect-square justify-center rounded-full align-top",
        indicator ? "overflow-visible" : "overflow-hidden",
        props.className,
        sizesPropsBySize[size]
      )}>
      <>
        <AvatarPrimitive.Image
          src={imageSrc ?? undefined}
          alt={alt}
          className={classNames("aspect-square rounded-full", sizesPropsBySize[size])}
        />
        <AvatarPrimitive.Fallback
          delayMs={600}
          asChild={props.asChild}
          className="flex h-full items-center justify-center">
          <>
            {props.fallback ? props.fallback : <img src={AVATAR_FALLBACK} alt={alt} className={rootClass} />}
          </>
        </AvatarPrimitive.Fallback>
        {indicator}
      </>
    </AvatarPrimitive.Root>
  );

  if (href) {
    avatar = <Link href={href}>{avatar}</Link>;
  }

  return title ? (
    <TooltipPrimitive.Provider>
      <Tooltip content={title}>{avatar}</Tooltip>
    </TooltipPrimitive.Provider>
  ) : (
    <>{avatar}</>
  );
}
