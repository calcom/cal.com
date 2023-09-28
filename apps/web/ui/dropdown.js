"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";
import { motion } from "framer-motion";
import Link from "next/link";

const ITEM_CLASS =
  "focus:outline-none ring-1 ring-transparent focus:bg-white dark:focus:bg-gray-100 cursor-pointer flex items-center px-2 py-[5px] text-sm hover:bg-white hover:shadow-[0_1px_2px_rgba(0,0,0,0.15)] focus:shadow-[0_1px_3px_rgba(0,0,0,0.15)] dark:focus:shadow-[0_1px_2px_rgba(0,0,0,0.9)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.9)] dark:hover:bg-white dark:hover:text-gray-800 dark:text-gray-200 dark:focus:text-gray-800 rounded-lg mb-[2px]";

const RenderItem = ({ item }) => {
  switch (item?.as) {
    case "divider":
      return <hr className="my-2 border-gray-300/50 dark:border-gray-700/50" />;
    case "a":
      return (
        <Link href={item?.href} passHref>
          <a
            tabIndex="1"
            role="button"
            target={item?.newTab ? "_blank" : ""}
            className={clsx(
              ITEM_CLASS,
              item?.className,
              item?.disabled &&
                "!cursor-default opacity-50 hover:!bg-transparent hover:!shadow-none dark:hover:!text-gray-300"
            )}>
            {item?.icon ? <span className="mr-2">{item?.icon}</span> : ""}
            {item?.title}
          </a>
        </Link>
      );
    default:
      return (
        <DropdownMenu.Item asChild disabled={item?.disabled}>
          <div
            className={clsx(
              ITEM_CLASS,
              item?.className,
              item?.disabled &&
                "!cursor-default opacity-50 hover:!bg-transparent hover:!shadow-none dark:hover:!text-gray-300"
            )}
            onClick={item?.onClick}>
            {item?.icon ? <span className="mr-2">{item?.icon}</span> : ""}
            {item?.title}
          </div>
        </DropdownMenu.Item>
      );
  }
};

const Dropdown = ({ trigger, side, align, items } = {}) => {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <div>{trigger}</div>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal asChild>
        <DropdownMenu.Content
          sideOffset={10}
          side={side ?? "bottom"}
          align={align ?? "center"}
          className="relative z-[200] focus:outline-none">
          <motion.div
            className={clsx(
              "relative z-[10] min-w-[200px] rounded-xl bg-gray-100/50 px-2 py-[8px] shadow-[0_1px_10px_rgba(0,0,0,0.15)] ring-1 ring-gray-400/20 backdrop-blur-xl dark:bg-gray-900/80 dark:shadow-[0_2px_20px_rgba(0,0,0,0.5)] dark:ring-gray-700"
            )}
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { duration: 0.25, type: "spring" },
            }}
            exit={{
              opacity: 0,
              scale: 0.8,
            }}>
            <>
              <div className="absolute bottom-0 left-0 z-0 h-[10px] w-full rounded-b-lg bg-gradient-to-b from-transparent to-white/[0.2] dark:to-black/10" />
              <DropdownMenu.Arrow className="h-2 w-3 fill-white/80 drop-shadow-[0_1px_0px_rgba(0,0,0,0.3)] dark:fill-gray-800 dark:drop-shadow-[0_1px_0px_rgba(255,255,255,0.3)]" />
              {items?.map((item, index) =>
                item?.hide ? "" : <RenderItem item={item} key={index + item?.title} />
              )}
            </>
          </motion.div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default Dropdown;
