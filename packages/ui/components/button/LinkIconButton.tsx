
import Link, { LinkProps } from "next/link";
import React from "react";

import { Icon } from "../icon";
import type { IconName } from "../icon";

// Props specific to LinkIconButton
interface LinkIconButtonBaseProps {
  Icon: IconName;
  children?: React.ReactNode;
  className?: string; // Add className to interface locally to allow override
}

// Polymorphic props: either button props OR link props
type LinkIconButtonProps = LinkIconButtonBaseProps &
  (
    | (Omit<JSX.IntrinsicElements["button"], "onClick" | "ref"> & { href?: never; onClick?: React.MouseEventHandler<HTMLButtonElement> })
    | (Omit<JSX.IntrinsicElements["a"], "href" | "onClick" | "ref"> & LinkProps & { onClick?: React.MouseEventHandler<HTMLAnchorElement> })
  );

export default function LinkIconButton(props: LinkIconButtonProps) {
  const { Icon: IconName, children, className, ...rest } = props;

  const commonClasses = "text-md hover:bg-emphasis hover:text-emphasis text-default flex items-center rounded-md px-2 py-1 text-sm font-medium";
  const combinedClassName = className ? `${commonClasses} ${className}` : commonClasses;

  // Check if it's a link
  const isLink = "href" in props && typeof props.href !== "undefined";

  if (isLink) {
    const { href, target, rel, onClick, ...linkProps } = rest as LinkProps & Omit<JSX.IntrinsicElements["a"], "href">;
    return (
      <div className="-ml-2">
        <Link
          href={href}
          className={combinedClassName}
          target={target}
          rel={rel}
          onClick={onClick}
          {...(linkProps as any)}
        >
          <Icon name={IconName} className="text-subtle h-4 w-4 ltr:mr-2 rtl:ml-2" />
          {children}
        </Link>
      </div>
    );
  }

  // Render as button
  return (
    <div className="-ml-2">
      <button
        type="button"
        className={combinedClassName}
        {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        <Icon name={IconName} className="text-subtle h-4 w-4 ltr:mr-2 rtl:ml-2" />
        {children}
      </button>
    </div>
  );
}
