"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";


import type { LayoutProps } from "@calcom/features/shell/Shell";
import { Button } from "@calcom/ui/components/button";

export const ShellMainAppDirBackButton = ({ backPath }: { backPath: LayoutProps["backPath"] }) => {
  const router = useRouter();
  return (
    <Button
      variant="icon"
      size="sm"
      color="minimal"
      onClick={() => (typeof backPath === "string" ? router.push(backPath as string) : router.back())}
      StartIcon={ArrowLeftIcon}
      aria-label="Go Back"
      className="rounded-md ltr:mr-2 rtl:ml-2"
      data-testid="go-back-button"
    />
  );
};
