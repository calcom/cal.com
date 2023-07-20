"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Skeleton } from "@calcom/ui";

export const BackButtonInSidebar = ({ name }: { name: string }) => {
  const { t } = useLocale();
  return (
    <Link
      href="/"
      className="hover:bg-subtle [&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis group-hover:text-default text-emphasis group my-6 flex h-6 max-h-6 w-full flex-row items-center rounded-md px-3 py-2 text-sm font-medium leading-4"
      data-testid={`vertical-tab-${t(name)}`}>
      <ArrowLeft className="h-4 w-4 stroke-[2px] ltr:mr-[10px] rtl:ml-[10px] rtl:rotate-180 md:mt-0" />
      <Skeleton title={name} as="p" className="max-w-36 min-h-4 truncate" loadingClassName="ms-3">
        {name}
      </Skeleton>
    </Link>
  );
};
