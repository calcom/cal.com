"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import type { CredentialOwner } from "@calcom/app-store/types";
import { useIsPlatform } from "@calcom/atoms/monorepo";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { AppListCard as AppListCardComponent } from "@calcom/ui";

type ShouldHighlight =
  | {
      slug: string;
      shouldHighlight: true;
    }
  | {
      shouldHighlight?: never;
      slug?: never;
    };

export type AppListCardProps = {
  logo?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  isDefault?: boolean;
  isTemplate?: boolean;
  invalidCredential?: boolean;
  children?: ReactNode;
  credentialOwner?: CredentialOwner;
  className?: string;
} & ShouldHighlight;

const schema = z.object({ hl: z.string().optional() });

function AppListCardPlatformWrapper(props: AppListCardProps) {
  const logo = `https://app.cal.com${props.logo}`;
  return <AppListCardComponent {...props} logo={logo} />;
}
function AppListCardWebWrapper(props: AppListCardProps) {
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

export default function AppListCard(props: AppListCardProps) {
  const isPlatform = useIsPlatform();
  return isPlatform ? <AppListCardPlatformWrapper {...props} /> : <AppListCardWebWrapper {...props} />;
}
