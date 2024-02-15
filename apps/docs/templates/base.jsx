import * as React from "react";

import cn from "classnames"
import { NavigationBar } from "@components/common-alt/navigationbar"
import { Section } from "@components/uicomp/section"
import { Footer } from "@components/common-alt/footer"
import config from "@project-config"
import Link from "next/link";

export const Template = ({ title, titleHref, showNavbarGuides, path, fixedHeading, noFooter, meta, files, children, searchData, idPathMetaMap }) => {
  const _title = title || meta?.template?.title
  const _titleHref = titleHref || meta?.template?.titleHref
  return (
    <div className="relative">
      <div className={cn("z-30",
            {
              "sticky top-0": fixedHeading,
              "relative": !fixedHeading,
            }
          )}>
        <NavigationBar
            searchData={searchData}
            idPathMetaMap={idPathMetaMap}
            showGuides={showNavbarGuides || true}
            path={path}
            tabs={config?.navbar?.tabs}
          />
      </div>
      <div className="h-16" />
      { (_title) &&
        <Section Component="header" padding="sm" full>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 -mt-2 sm:mt-0">
            <Link className={"justify-self-start self-center plainLink font-semibold"}
              href={_titleHref}><h1>{ _title || <>&nbsp;</>}</h1></Link>
          </div>
        </Section>
      }
      <div>
        {meta?.template?.wrapInSection ?
          <Section full>
            <div className={meta?.template?.prose ? "prose prose-neutral max-w-none" : ""}>
              {children}
            </div>
          </Section>
          : <>{children}</>
        }
      </div>
      { !noFooter &&
        <>
          <Section Component="header" padding="small" full>
            <div className="h-40" />
          </Section>
          <Footer path={path} />
          <div className="h-20"/>
        </>
      }
    </div>
  )
}
