"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Children, Fragment, useEffect, useState } from "react";

type BreadcrumbProps = {
  children: React.ReactNode;
};
export const Breadcrumb = ({ children }: BreadcrumbProps) => {
  const childrenArray = Children.toArray(children);

  const childrenSeparated = childrenArray.map((child, index) => {
    // If not the last item in the array insert a /
    if (index !== childrenArray.length - 1) {
      return (
        <Fragment key={index}>
          {child}
          <span>/</span>
        </Fragment>
      );
    }
    // Else return just the child
    return child;
  });

  return (
    <nav className="text-default text-sm font-normal leading-5">
      <ol className="flex items-center space-x-2 rtl:space-x-reverse">{childrenSeparated}</ol>
    </nav>
  );
};

type BreadcrumbItemProps = {
  children: React.ReactNode;
  href: string;
  listProps?: JSX.IntrinsicElements["li"];
};

export const BreadcrumbItem = ({ children, href, listProps }: BreadcrumbItemProps) => {
  return (
    <li {...listProps}>
      <Link href={href}>{children}</Link>
    </li>
  );
};

export const BreadcrumbContainer = () => {
  const pathname = usePathname();
  const [, setBreadcrumbs] = useState<{ href: string; label: string }[]>();

  useEffect(() => {
    const rawPath = pathname; // Pathname doesn't include search params anymore

    let pathArray = rawPath?.split("/") ?? [];
    pathArray.shift();

    pathArray = pathArray.filter((path) => path !== "");

    const allBreadcrumbs = pathArray.map((path, idx) => {
      const href = `/${pathArray.slice(0, idx + 1).join("/")}`;
      return {
        href,
        label: path.charAt(0).toUpperCase() + path.slice(1),
      };
    });
    setBreadcrumbs(allBreadcrumbs);
  }, [pathname]);
};

export default Breadcrumb;
