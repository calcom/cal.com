import { ShellMainAppDirBackButton } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDirBackButton";
import classNames from "classnames";
import type { LayoutProps } from "~/shell/Shell";

// Copied from `ShellMain` but with a different `ShellMainAppDirBackButton` import
// for client/server component separation
export function ShellMainAppDir(props: LayoutProps) {
  return (
    <>
      {(props.heading || !!props.backPath) && (
        <div
          className={classNames(
            "flex items-center md:mt-0 md:mb-6",
            props.smallHeading ? "lg:mb-7" : "lg:mb-8"
          )}>
          {!!props.backPath && <ShellMainAppDirBackButton backPath={props.backPath} />}
          {props.heading && (
            <header
              className={classNames(
                props.large && "py-8",
                "flex w-full max-w-full flex-wrap items-center gap-4"
              )}>
              {props.HeadingLeftIcon && <div className="ltr:mr-4">{props.HeadingLeftIcon}</div>}
              <div className={classNames("hidden min-w-0 flex-1 truncate md:block", props.headerClassName)}>
                {props.heading && (
                  <h3
                    className={classNames(
                      "inline max-w-28 truncate font-cal font-semibold text-emphasis text-lg tracking-wide sm:max-w-72 sm:text-xl md:block md:max-w-80 xl:max-w-full",
                      props.smallHeading ? "text-base" : "text-xl"
                    )}>
                    {props.heading}
                  </h3>
                )}
                {props.subtitle && (
                  <p className="hidden text-default text-sm lg:block" data-testid="subtitle">
                    {props.subtitle}
                  </p>
                )}
              </div>
              {props.beforeCTAactions}
              {props.CTA && (
                <div
                  className={classNames(
                    props.backPath
                      ? "relative"
                      : "fixed bottom-20 pwa:bottom-[max(7rem,_calc(5rem_+_env(safe-area-inset-bottom)))] z-40 md:z-auto ltr:right-4 md:ltr:right-0 rtl:left-4 md:rtl:left-0",
                    "shrink-0 [-webkit-app-region:no-drag] md:relative md:right-auto md:bottom-auto"
                  )}>
                  {props.CTA}
                </div>
              )}
              {props.actions && props.actions}
            </header>
          )}
        </div>
      )}
      {props.afterHeading && <>{props.afterHeading}</>}

      <div className={classNames(props.flexChildrenContainer && "flex flex-1 flex-col")}>
        {props.children}
      </div>
    </>
  );
}
