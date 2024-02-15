import { Fragment, useState } from "react"
import { Dialog as HUIDialog, Transition } from "@headlessui/react"
import cn from "classnames"
import { IconButton } from "@components/uicomp/iconbutton"
import { Close } from "@components/icons-alt/close-1"

export const getAnimations = (position) => {
  switch (position) {
    case "topright": return {
        enter: "ease-out duration-300",
        enterFrom: "opacity-0 scale-95",
        enterTo: "opacity-100 scale-100",
        leave: "ease-in duration-200",
        leaveFrom: "opacity-100 scale-100",
        leaveTo: "opacity-0 scale-95",
    }
    case "slideleft": return {
        enter: "ease-out duration-300",
        enterFrom: "opacity-0 translate-x-[-400px]",
        enterTo: "opacity-100 translate-x-0",
        leave: "ease-in duration-200",
        leaveFrom: "opacity-100 translate-x-0",
        leaveTo: "opacity-0 translate-x-[-400px]",
    }
    case "slideright": return {
        enter: "ease-out duration-300",
        enterFrom: "opacity-0 translate-x-[400px]",
        enterTo: "opacity-100 translate-x-0",
        leave: "ease-in duration-200",
        leaveFrom: "opacity-100 translate-x-0",
        leaveTo: "opacity-0 translate-x-[400px]",
    }
    case "center":
      return {
        enter: "ease-out duration-200",
        enterFrom: "opacity-0 scale-95",
        enterTo: "opacity-100 scale-100",
        leave: "ease-in duration-200",
        leaveFrom: "opacity-100 scale-100",
        leaveTo: "opacity-0 scale-95",
      };
  }
}

export const Dialog = ({ isOpen, onClose, hideClose = false, position, size = "sm", children }) => {
  const animations = getAnimations(position)
  return <Transition show={isOpen} as={Fragment}>
      <HUIDialog open={isOpen} onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="z-50 fixed inset-0 bg-black/20 backdrop-blur-md" />
        </Transition.Child>
        <Transition.Child
          as={Fragment}
          {...animations}
        >
          <div className={cn(
              "z-50 fixed inset-y-0",
              {
                "top-0 right-0 origin-top-right": position === "topright",
                "top-0 right-0 origin-left": position === "slideleft",
                "top-0 right-0 origin-right": position === "slideright",
                "top-0 left-0 w-4/5 max-w-[400px]": position === "slideleft",
                "top-0 right-0 w-4/5 max-w-[400px]": position === "slideright",
                "p-4 w-full": position === "topright",
                "inset-4 sm:inset-0 flex items-center justify-center": position === "center",
                "max-w-sm": size === "sm" && position === "topright",
                "max-w-xs": size === "xs" && position === "topright",
              }
            )}>

            <HUIDialog.Panel className={cn(
                "relative w-full bg-white",
                {
                  "rounded-lg": position !== "slideleft" && position !== "slideright",
                  "h-screen": position === "slideleft" || position === "slideright",
                  "max-w-screen-sm sm:rounded-lg": position === "center",
                })}>
              {!hideClose &&
                <div className="absolute z-50 right-4 top-4">
                  <IconButton
                    Component="a"
                    Icon={Close}
                    onClick={onClose}
                    ariaLabel="Close menu" />
                </div>
              }
              {children}
            </HUIDialog.Panel>
          </div>
        </Transition.Child>
      </HUIDialog>
    </Transition>
}

<Dialog isOpen={true} position="center" onClose={() => {}}>
  Hello<br />
  Hello<br />
  Hello<br />
</Dialog>