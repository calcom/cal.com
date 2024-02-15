import { useMemo, useState } from "react"
import { Logo } from "@components/common-alt/logo"
import { AnimatedTabBar } from "@components/uicomp/animatedtabbar"
import { Button } from "@components/uicomp/button"
import { IconButton } from "@components/uicomp/iconbutton"
import { Menu } from "@components/icons-alt/menu-1"
import { MenuAlt1 } from "@components/icons-alt/menu-alt-1"
import { AnimatedSidebar } from "@components/uicomp/animated-sidebar"
import config from "@project-config"
import { Guides } from "@components/uicomp/guides-1"
import { Dialog } from "@components/uicomp/dialog-1"
import { Search } from "@components/common-alt/search"
import Link from "next/link"


export const NavigationBar = ({ showGuides, path, tabs, searchData, idPathMetaMap }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const selectedTab = useMemo(() => {
    if (!path) {
      return -1
    }
    return tabs?.findIndex(t => path.startsWith(t.href))
  }, [path])

  return <header className="flex relative px-4 py-4 items-center bg-primary-50/50 backdrop-blur supports-backdrop-blur:bg-primary-50/60">
      <div className="h-full w-full max-w-[90rem] mx-auto">
        <div className="flex flex-row gap-4 items-center h-full">
        <div className="flex-none">
        <Logo className="h-6" />
        <div className="block md:hidden z-20 absolute right-2.5 top-[10px]">
        <IconButton
          Icon={MenuAlt1}
          ariaLabel="Open sidebar"
          onClick={() => setIsMobileSidebarOpen(s => !s)}
        />
      </div>
      <Dialog isOpen={isMobileSidebarOpen} position="slideright" size="xs" onClose={() => setIsMobileSidebarOpen(false)}>
        <div className="w-full h-full overflow-y-auto hiddenScrollbar pt-8 pb-32 sm:pb-8 pr-4 pl-4">
        <div className="z-50 -mt-4 w-4/5">
          <Search data={searchData} idPathMetaMap={idPathMetaMap} />
        </div>
          <AnimatedSidebar
            showSearch={true}
            sidebarConfig={config.sidebar}
            currentPath={path}
            activeCursorClassName="bg-primary-700"
            ghostCursorClassName="bg-primary-700"
            onClickClick={() => setIsMobileSidebarOpen(false) }
          />
        </div>
      </Dialog>
          </div>
          <div className="block sm:hidden grow" />
          <nav className="hidden sm:flex grow overflow-x-auto hiddenScrollbar justify-start md:justify-center">
            <div className="hidden font-matter border-primary-700 relative z-20 border-2 bg-white text-lg uppercase leading-[22px] lg:absolute lg:left-10 lg:top-[23px] lg:right-0 lg:mx-auto lg:w-min xl:left-0 rounded-full max-w-full overflow-y-auto hiddenScrollbar">
              <AnimatedTabBar
                  items={tabs}
                  selectedIndex={selectedTab}
                  linkClassName="relative -mx-3 [&:first-child]:ml-0 [&:nth-child(5)]:mr-0 block px-7 py-4 text-white mix-blend-difference"
                  linkSelectedClassName=""
                  ghostClassName="bg-primary-700 border-primary-50 border-2 rounded-full"
                />
            </div>
          </nav>
          <div className="hidden md:flex h-full items-center flex-none">
            <Button href="https://app.cal.com" size="md" variant="pill">Login</Button>
          </div>
          <div className="hidden sm:hidden h-full items-center flex-none">
            <IconButton
              Icon={Menu}
              ariaLabel="Open menu"
              onClick={() => setIsOpen(true)}
            />
          </div>
        </div>
      </div>
      {/*<HorizontalGuide className="absolute left-0 right-0 bottom-0" />*/}
      <Dialog isOpen={isOpen} position="topright" size="xs" onClose={() => setIsOpen(false)}>
        <div className="flex flex-col pt-3 pb-6">
          { tabs?.map((item, i) => {
            return <Link key={`tabs-${i}`} className="text-neutral-900 hover:text-sky-500 px-6 py-3 transition text-base font-medium outline-none" href={item.href}>{ item.label }</Link>
          })}
          <div className="px-6 mt-4 flex justify-start">
            <Button href="/login">Sign in</Button>
          </div>
        </div>
      </Dialog>
      { false && showGuides &&
        <div style={{ zIndex: -1 }} className="pointer-events-none absolute left-4 right-4 top-0 bottom-0 hidden sm:block">
          <Guides />
        </div>
      }
    </header>
}
