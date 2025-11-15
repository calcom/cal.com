"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SkeletonText } from "@calcom/ui/components/skeleton";

type OnboardingCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  isLoading?: boolean;
};

export const OnboardingCard = ({ title, subtitle, children, footer, isLoading }: OnboardingCardProps) => {
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
          <div className="flex w-full gap-1.5 py-4">
            <div className="flex w-full flex-col gap-1">
              <h1 className="font-cal text-xl font-semibold leading-6">{title}</h1>
              <p className="text-subtle text-sm font-medium leading-tight">{subtitle}</p>
            </div>
          </div>

          {/* Content */}
          <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-4">
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
      <div className="flex w-full items-center justify-start py-2 md:px-5 md:py-4">{footer}</div>
    </div>
  );
};
