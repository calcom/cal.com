import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { Provider as TooltipPrimitiveProvider } from "@radix-ui/react-tooltip";
import { cva } from "class-variance-authority";
import Link from "next/link";

import { AVATAR_FALLBACK } from "@calcom/lib/constants";
import classNames from "@calcom/ui/classNames";

import { Tooltip } from "../tooltip";

type Maybe<T> = T | null | undefined;

export type AvatarProps = {
  className?: string;
  size?: "xs" | "xsm" | "sm" | "md" | "mdLg" | "lg" | "xl";
  shape?: "circle" | "square";
  imageSrc?: Maybe<string>;
  title?: string;
  alt: string;
  href?: string | null;
  fallback?: React.ReactNode;
  accepted?: boolean;
  asChild?: boolean; // Added to ignore the outer span on the fallback component - messes up styling
  indicator?: React.ReactNode;
  "data-testid"?: string;
};

const avatarClasses = cva(
  "bg-emphasis border-default relative inline-flex aspect-square items-center justify-center border align-top",
  {
    variants: {
      size: {
        xs: "w-4 h-4 min-w-4 min-h-4 max-h-4", // 16px
        xsm: "w-5 h-5 min-w-5 min-h-5", // 20px
        sm: "w-6 h-6 min-w-6 min-h-6", // 24px
        md: "w-8 h-8 min-w-8 min-h-8", // 32px
        mdLg: "w-10 h-10 min-w-10 min-h-10", // 40px
        lg: "w-16 h-16 min-w-16 min-h-16", // 64px
        xl: "w-24 h-24 min-w-24 min-h-24", // 96px
      },
      shape: {
        circle: "rounded-full",
        square: "",
      },
    },
    defaultVariants: {
      size: "md",
      shape: "circle",
    },
    compoundVariants: [
      {
        size: ["xs", "xsm", "sm"],
        shape: "square",
        className: "rounded",
      },
      {
        size: ["md"],
        shape: "square",
        className: "rounded-md",
      },
      {
        size: ["mdLg", "lg", "xl"],
        shape: "square",
        className: "rounded-[10px]",
      },
    ],
  }
);

export function Avatar(props: AvatarProps) {
  const { imageSrc, size = "md", alt, title, href, indicator } = props;
  const avatarClass = avatarClasses({ size, shape: props.shape });
  const rootClass = classNames("aspect-square rounded-full", avatarClass);
  let avatar = (
    <AvatarPrimitive.Root
      data-testid={props?.["data-testid"]}
      className={classNames(
        avatarClass,
        indicator ? "overflow-visible" : "overflow-hidden",
        props.className
      )}>
      <>
        <AvatarPrimitive.Image
          src={imageSrc ?? undefined}
          alt={alt}
          className={classNames("aspect-square", avatarClass)}
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
    avatar = (
      <Link data-testid="avatar-href" href={href}>
        {avatar}
      </Link>
    );
  }

  return title ? (
    <TooltipPrimitiveProvider>
      <Tooltip content={title}>{avatar}</Tooltip>
    </TooltipPrimitiveProvider>
  ) : (
    <>{avatar}</>
  );
}
