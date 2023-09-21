import * as RadixTooltip from "@radix-ui/react-tooltip";
import clsx from "clsx";
import { motion } from "framer-motion";

const Tooltip = ({
  children,
  text,
  delay,
  align,
  side,
  hasShortcut,
  triggerClass,
  noSpacing,
  sideOffset,
  alignOffset,
  show = true,
} = {}) => (
  <RadixTooltip.Provider>
    <RadixTooltip.Root delayDuration={delay ?? 200}>
      <RadixTooltip.Trigger className={`focus:outline-none ${triggerClass || ""}`} asChild>
        <div>{children}</div>
      </RadixTooltip.Trigger>

      {show ? (
        <RadixTooltip.Portal className="relative z-[99999]">
          <RadixTooltip.Content
            side={side ?? "top"}
            align={align ?? "center"}
            sideOffset={sideOffset ?? 5}
            alignOffset={alignOffset ?? 5}
            className="relative z-[110]">
            <>
              <motion.div
                className={clsx(
                  "flex items-center rounded-lg border bg-white text-sm text-gray-500 shadow-[0_0_3px_rgba(0,0,0,0.08)]",
                  noSpacing ? "" : "px-2 py-1"
                )}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  transition: { duration: 0.2, type: "spring" },
                }}
                exit={{ opacity: 0, scale: 0.8 }}>
                {text}
                {hasShortcut ? (
                  <span className="ml-1 rounded bg-gray-700 px-2 py-px font-mono text-[0.84rem] leading-none text-white shadow-black/40 dark:bg-gray-700">
                    {hasShortcut}
                  </span>
                ) : (
                  ""
                )}
                {/* <RadixTooltip.Arrow className="!fill-gray-200" /> */}
              </motion.div>
            </>
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      ) : (
        ""
      )}
    </RadixTooltip.Root>
  </RadixTooltip.Provider>
);

export default Tooltip;
