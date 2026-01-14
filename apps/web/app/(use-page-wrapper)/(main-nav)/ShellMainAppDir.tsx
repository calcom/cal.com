import { Header } from "@calid/features/ui/Header";
import { ShellMainAppDirBackButton } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDirBackButton";
import classNames from "classnames";

import type { LayoutProps } from "@calcom/features/shell/Shell";

interface ShellMainAppDirProps extends LayoutProps {
  CTA?: React.ReactNode;
  MobileCTA?: React.ReactNode;
}

// Copied from `ShellMain` but with a different `ShellMainAppDirBackButton` import
// for client/server component separation
export function ShellMainAppDir(props: ShellMainAppDirProps) {
  return (
    <>
      {(props.heading || !!props.backPath) && (
        <div
          className={classNames(
            "bg-default sticky top-0 z-10 flex items-center md:mb-6 md:mt-0",
            props.smallHeading ? "lg:mb-7" : "lg:mb-4"
          )}>
          <div className="flex flex-1 items-center">
            {!!props.backPath && <ShellMainAppDirBackButton backPath={props.backPath} />}
            {props.heading && <Header heading={props.heading} subtitle={props.subtitle} />}
          </div>
          {/* Mobile CTA in heading area */}
          {props.MobileCTA && <div className="ml-auto md:hidden">{props.MobileCTA}</div>}
        </div>
      )}
      {props.afterHeading && <>{props.afterHeading}</>}
      {props.CTA && <div className="my-6">{props.CTA}</div>}

      <div className={classNames(props.flexChildrenContainer && "flex flex-1 flex-col")}>
        {props.children}
      </div>
    </>
  );
}
