import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { Badge, ListItemText } from "@calcom/ui";
import { AlertCircle } from "@calcom/ui/components/icon";

type ShouldHighlight = { slug: string; shouldHighlight: true } | { shouldHighlight?: never; slug?: never };

type AppListCardProps = {
  logo?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  isDefault?: boolean;
  isTemplate?: boolean;
  invalidCredential?: boolean;
  children?: ReactNode;
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
  } = props;
  const {
    data: { hl },
  } = useTypedQuery(schema);
  const router = useRouter();
  const [highlight, setHighlight] = useState(shouldHighlight && hl === slug);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (shouldHighlight && highlight) {
      const timer = setTimeout(() => {
        setHighlight(false);
        const url = new URL(window.location.href);
        url.searchParams.delete("hl");
        router.replace(url.pathname, undefined, { shallow: true });
      }, 3000);
      timeoutRef.current = timer;
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`${highlight ? "dark:bg-muted bg-yellow-100" : ""}`}>
      <div className="flex gap-x-3 px-5 py-4">
        {logo ? <img className="h-10 w-10" src={logo} alt={`${title} logo`} /> : null}
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

        {actions}
      </div>
      {children && <div className="w-full">{children}</div>}
    </div>
  );
}
