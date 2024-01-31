import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import type { CredentialOwner } from "@calcom/app-store/types";
import classNames from "@calcom/lib/classNames";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { Badge, ListItemText, Avatar } from "@calcom/ui";
import { AlertCircle } from "@calcom/ui/components/icon";

type ShouldHighlight =
  | {
      slug: string;
      shouldHighlight: true;
    }
  | {
      shouldHighlight?: never;
      slug?: never;
    };

type AppListCardProps = {
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

export default function AppListCard(props: AppListCardProps) {
  const { t } = useLocale();
  const {
    logo,
    title,
    description,
    actions,
    isDefault,
    slug,
    shouldHighlight,
    isTemplate,
    invalidCredential,
    children,
    credentialOwner,
    className,
  } = props;
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

  return (
    <div className={classNames(highlight && "dark:bg-muted bg-yellow-100", className)}>
      <div className="flex items-center gap-x-3 px-4 py-4 sm:px-6">
        {logo ? (
          <img
            className={classNames(logo.includes("-dark") && "dark:invert", "h-10 w-10")}
            src={logo}
            alt={`${title} logo`}
          />
        ) : null}
        <div className="flex grow flex-col gap-y-1 truncate">
          <div className="flex items-center gap-x-2">
            <h3 className="text-emphasis truncate text-sm font-semibold">{title}</h3>
            <div className="flex items-center gap-x-2">
              {isDefault && <Badge variant="green">{t("default")}</Badge>}
              {isTemplate && <Badge variant="red">Template</Badge>}
            </div>
          </div>
          <ListItemText component="p">{description}</ListItemText>
          {invalidCredential && (
            <div className="flex gap-x-2 pt-2">
              <AlertCircle className="h-8 w-8 text-red-500 sm:h-4 sm:w-4" />
              <ListItemText component="p" className="whitespace-pre-wrap text-red-500">
                {t("invalid_credential")}
              </ListItemText>
            </div>
          )}
        </div>
        {credentialOwner && (
          <div>
            <Badge variant="gray">
              <div className="flex items-center">
                <Avatar
                  className="mr-2"
                  alt={credentialOwner.name || "Nameless"}
                  size="xs"
                  imageSrc={getPlaceholderAvatar(credentialOwner.avatar, credentialOwner?.name as string)}
                />
                {credentialOwner.name}
              </div>
            </Badge>
          </div>
        )}

        {actions}
      </div>
      {children && <div className="w-full">{children}</div>}
    </div>
  );
}
