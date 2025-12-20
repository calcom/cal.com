"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SkeletonText } from "@calcom/ui/components/skeleton";

type OnboardingCardProps = {
  title: string;
  subtitle: string;
  children?: ReactNode;
  footer?: ReactNode;
  isLoading?: boolean;
  floatingFooter?: boolean;
};

export const OnboardingCard = ({
  title,
  subtitle,
  children,
  footer,
  isLoading,
  floatingFooter = false,
}: OnboardingCardProps) => {
  const pathname = usePathname();

  // Animation variants for entry and exit
  const containerVariants = {
    initial: {
      opacity: 0,
      y: 20,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      y: -20,
    },
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          className="flex h-full min-h-0 w-full flex-col"
          variants={containerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            duration: 0.5,
            ease: "backOut",
          }}>
          {/* Card Header */}
          <div className="mb-2 flex w-full gap-1.5 py-2  md:mb-0 md:py-4">
            <div className="flex w-full flex-col gap-2">
              <h1 className="font-cal text-xl font-semibold leading-6">{title}</h1>
              <p className="text-subtle text-sm leading-tight">{subtitle}</p>
            </div>
          </div>

          {/* Content */}
          <div
            className={`flex h-full min-h-0 w-full flex-1 flex-col gap-4 [container-type:size] ${
              floatingFooter ? "pb-10" : ""
            }`}>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SkeletonText className="h-40 w-full" />
                <SkeletonText className="h-40 w-full" />
              </div>
            ) : (
              children
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      {floatingFooter ? (
        <div className="absolute bottom-0 left-0 right-[12px] z-10 flex items-center justify-start rounded-[12px] bg-[rgba(255,255,255,0.01)] p-2 shadow-[0px_12px_32px_-6px_rgba(0,0,0,0.12),0px_0px_0px_1px_rgba(111,107,107,0.1),0px_1px_3px_0px_rgba(63,70,75,0.1)] backdrop-blur-[6px] backdrop-filter">
          {footer}
        </div>
      ) : (
        <div className="mt-4 flex w-full items-center justify-start py-2">{footer}</div>
      )}
    </div>
  );
};
