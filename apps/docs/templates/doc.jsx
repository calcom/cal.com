import * as React from "react";

import { Markprompt } from '@markprompt/react';

import cn from "classnames"
import { Sparkles } from "@components/icons-alt/sparkles"
import { useEffect, useMemo, useRef, useState } from "react"
import { removeFileExtension, toPathMetaMap, toIdPathMetaMap } from "@utils/files"
import { Template as BaseTemplate } from "@templates/base"
import { Section } from "@components/uicomp/section"
import { Search, filesToSearchData } from "@components/common-alt/search"
import { AnimatedSidebar } from "@components/uicomp/animated-sidebar"
import { Footer } from "@components/common-alt/footer"
import { TOC } from "@components/uicomp/toc"
import { Feedback } from "@components/uicomp/feedback"
// import { Prompt } from "@components/common-alt/prompt"
import { getPrevNext } from "@utils/sidebar"
import config from "@project-config"

export const NextPrevLink = ({ slug, title, isPrev }) => {
  return <div className={!isPrev ? "text-right" : ""}>
    <p className="text-neutral-700 dark:text-white/50 text-base mb-1">{isPrev ? "Prev" : "Next"}</p>
    <a className="text-xl font-semibold hover:text-primary-600 transition no-underline" href={slug}>{title}</a>
  </div>
}

export const sectionHeadings = [
  "Getting Started",
  "Guides",
  "Reference",
  "Embed",
  "Self-Hosting",
]

export const Template = ({ filename, files, path, meta, children }) => {
  const sidebarContainerRef = useRef()
  const [sidebarTop, setSidebarTop] = useState(600)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const pathMetaMap = useMemo(() => {
    return toPathMetaMap(files)
  }, [files])

  const idPathMetaMap = useMemo(() => {
    return toIdPathMetaMap(files)
  }, [files])

  const { prev, next } = getPrevNext(config.sidebar, pathMetaMap, path)

  const searchData = useMemo(() => {
      return filesToSearchData(files, undefined, "Home")
  }, [files])

  useEffect(() => {
    setSidebarTop(
      sidebarContainerRef.current?.getBoundingClientRect()?.top
      || 600)
  }, [])

  return (
    <BaseTemplate
      titleHref="/docs"
      path={path}
      fixedHeading
      noFooter
      searchData={searchData}
      idPathMetaMap={idPathMetaMap}
      >

      <div
        style={{
          width: "min(18rem, calc(25% - 8px))",
        }}
        className="hidden md:block fixed z-20 inset-0 top-[106px] left-[max(16px,calc(50%-45rem))]">
        {/* Slight hack: we place the search bar here,
        and not inside the sticky header, to avoid
        having to use portals to prevent the results
        from being cut out by the overflow-y-auto div. */}
        <div className="z-50 absolute top-6 pr-4 w-full">
          <Search data={searchData} idPathMetaMap={idPathMetaMap} />
        </div>
        <div className="overflow-y-auto hiddenScrollbar h-full pb-10">
          <div className="sticky z-10 top-0 pointer-events-none ml-[1px]">
            <div className="h-10 bg-primary-50" />
            <div className="bg-primary-50 relative pointer-events-auto pr-4 pb-2 h-10">
            </div>
            <div className="h-10 bg-gradient-to-b from-primary-50" />
          </div>
          <div className="relative pr-4">
            <AnimatedSidebar
              sidebarConfig={config.sidebar}
              currentPath={path}
              activeCursorClassName="bg-primary-700"
              ghostCursorClassName="bg-primary-700"
            />
          </div>
        </div>
      </div>
      <Section>
        <div className="hidden md:block"/>
        <div id="content" className={cn("prose prose-neutral prose-md sm:prose-lg z-10 max-w-none ", {
          "sm:col-span-2": !meta?.fullWidth,
          "sm:col-span-3": meta?.fullWidth,
        })}>
          {!meta?.hideTitle &&
            <h1 className={cn({
              "text-3xl sm:text-4xl md:text-5xl": meta?.hugeTitle,
              "text-2xl sm:text-3xl md:text-4xl": !meta?.hugeTitle
            })}>
              { meta?.title || (filename && removeFileExtension(filename)) || "Untitled page" }
            </h1>
          }
          { (meta?.description) &&
            <p className="indexDescription">
              { meta?.description }
            </p>
          }
          {children}

        { !meta?.omitFeedback &&
          <div className="flex justify-start mt-16 not-prose">
            <Feedback
                path={path}
                formspreeId={config?.feedback?.formspreeId}
              />
          </div>
        }
          <div className="mt-24 grid grid-cols-2">
            <div>
              {prev &&
                <NextPrevLink
                  title={prev.title}
                  slug={prev.href}
                  isPrev />
              }
            </div>
            <div className="flex justify-end">
              {next &&
                <NextPrevLink
                  title={next.title}
                  slug={next.href} />
              }
            </div>
          </div>
        </div>
        {/**/}
        {!meta?.fullWidth &&
          <div className="sticky z-10 top-20 overflow-y-auto hidden md:block pt-8 pl-4">
            {!meta?.fullWidth && !meta?.noTOC &&
              <>
                <div style={{
                  maxHeight: "calc(100vh - 260px)"
                }}>
                  <TOC offset={120} />
                </div>
              </>
            }
          </div>
        }
        {/**/}
        <div className="hidden sm:block"/>
        <div className="py-8" />
        <div className="hidden prose prose-neutral prose-lg sm:prose-xl sm:col-span-2 md:col-span-3 max-w-none z-50">
          <div className="-ml-8 md:-ml-4 -mr-8 md:-mr-4 mt-32 md:pb-20">
            <Footer sidebar hideGuides skipLogoColumn background="transparent" path={path} />
          </div>
        </div>
      </Section>
      <Markprompt projectKey={process.env.NEXT_PUBLIC_MARKPROMPT_PROJECT_KEY} chat={{history: false}}>
        <button className="fixed bottom-8 right-8 border rounded-full z-40 bg-black py-3 pl-5 pr-6 hover:bg-neutral-800 transition cusor-pointer outline-none flex flex-row items-center gap-2 text-white uppercase">
          <Sparkles className="w-5 h-5 text-white" />
          Ask AI
        </button>
      </Markprompt>
    </BaseTemplate>
  )
}
