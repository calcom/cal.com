"use client";

import { Button } from "@calcom/ui/components/button";
import { useRouter } from "next/navigation";
import type { LayoutProps } from "~/shell/Shell";

export const ShellMainAppDirBackButton = ({ backPath }: { backPath: LayoutProps["backPath"] }) => {
  const router = useRouter();
  return (
    <Button
      variant="icon"
      size="sm"
      color="minimal"
      onClick={() => (typeof backPath === "string" ? router.push(backPath as string) : router.back())}
      StartIcon="arrow-left"
      aria-label="Go Back"
      className="rounded-md ltr:mr-2 rtl:ml-2"
      data-testid="go-back-button"
    />
  );
};
