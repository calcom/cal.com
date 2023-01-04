import Link from "next/link";
import { useRouter } from "next/router";
import { Children, Fragment, useEffect, useState } from "react";

type BreadcrumbProps = {
  children: React.ReactNode;
};
export const Breadcrumb = ({ children }: BreadcrumbProps) => {
  const childrenArray = Children.toArray(children);

  const childrenSeperated = childrenArray.map((child, index) => {
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
    <nav className="text-sm font-normal leading-5 text-gray-600">
      <ol className="flex items-center space-x-2 rtl:space-x-reverse">{childrenSeperated}</ol>
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
      <Link href={href}>
        <a>{children}</a>
      </Link>
    </li>
  );
};

export const BreadcrumbContainer = () => {
  const router = useRouter();
  const [breadcrumbs, setBreadcrumbs] = useState<{ href: string; label: string }[]>();

  useEffect(() => {
    const rawPath = router.asPath.split("?")[0]; // this will ignore any query params for now?

    let pathArray = rawPath.split("/");
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
  }, [router.asPath]);
};

export default Breadcrumb;
