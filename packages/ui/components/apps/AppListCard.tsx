"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { AppListCard as AppListCardComponent } from "@calcom/ui";
import type { AppListCardProps } from "@calcom/ui/components/apps/app-list-card";

type ShouldHighlight =
  | {
      slug: string;
      shouldHighlight: true;
    }
  | {
      shouldHighlight?: never;
      slug?: never;
    };

const schema = z.object({ hl: z.string().optional() });

export default function AppListCard(props: AppListCardProps) {
  const { slug, shouldHighlight } = props;
  const {
    data: { hl },
  } = useTypedQuery(schema);
  const router = useRouter();
  const [highlight, setHighlight] = useState(shouldHighlight && hl === slug);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchParams = useCompatSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    if (shouldHighlight && highlight && searchParams !== null && pathname !== null) {
      timeoutRef.current = setTimeout(() => {
        const _searchParams = new URLSearchParams(searchParams);
        _searchParams.delete("hl");
        _searchParams.delete("category"); // this comes from params, not from search params

        setHighlight(false);

        const stringifiedSearchParams = _searchParams.toString();

        router.replace(`${pathname}${stringifiedSearchParams !== "" ? `?${stringifiedSearchParams}` : ""}`);
      }, 3000);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [highlight, pathname, router, searchParams, shouldHighlight]);

  return <AppListCardComponent {...props} />;
}
