"use client";

import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

type OnboardingPageTransitionProps = {
  children: React.ReactNode;
};

// Wraps children with AnimatePresence to enable exit animations for OnboardingCard
export const OnboardingPageTransition = ({ children }: OnboardingPageTransitionProps) => {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <div key={pathname}>{children}</div>
    </AnimatePresence>
  );
};
