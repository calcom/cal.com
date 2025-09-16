import { Header } from "@calid/features/ui/Header";
import { ShellMainAppDirBackButton } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDirBackButton";
import classNames from "classnames";

import type { LayoutProps } from "@calcom/features/shell/Shell";

// Copied from `ShellMain` but with a different `ShellMainAppDirBackButton` import
// for client/server component separation
export function ShellMainAppDir(props: LayoutProps) {
  return (
    <>
      {(props.heading || !!props.backPath) && (
        <div
          className={classNames(
            "bg-default sticky top-0 z-10 flex items-center md:mb-6 md:mt-0",
            props.smallHeading ? "lg:mb-7" : "lg:mb-4"
          )}>
          {!!props.backPath && <ShellMainAppDirBackButton backPath={props.backPath} />}
          {props.heading && <Header heading={props.heading} subtitle={props.subtitle} />}
        </div>
      )}
      {props.afterHeading && <>{props.afterHeading}</>}

      <div className={classNames(props.flexChildrenContainer && "flex flex-1 flex-col")}>
        {props.children}
      </div>
    </>
  );
}
