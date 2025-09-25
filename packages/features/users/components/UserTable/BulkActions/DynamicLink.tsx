import type { Table } from "@tanstack/react-table";
import { useQueryState, parseAsBoolean } from "nuqs";

import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calid/features/ui/components/button";

export function DynamicLink<T extends { username: string | null }>({
  table,
  domain,
  onlyButton = false,
}: {
  table: Table<T>;
  domain: string;
  onlyButton?: boolean;
}) {
  const { t } = useLocale();
  const [dynamicLinkVisible, _] = useQueryState("dynamicLink", parseAsBoolean);
  const { copyToClipboard, isCopied } = useCopy();
  const numberOfSelectedRows = table.getSelectedRowModel().rows.length;
  const isVisible = numberOfSelectedRows >= 2 && dynamicLinkVisible;

  const users = table
    .getSelectedRowModel()
    .flatRows.map((row) => row.original.username)
    .filter((u): u is string => u !== null);

  const usersNameAsString = users.join("+");

  const dynamicLinkOfSelectedUsers = `${domain}/${usersNameAsString}`;
  const domainWithoutHttps = dynamicLinkOfSelectedUsers.replace(/https?:\/\//g, "");

  return (
    <>
      {isVisible && !onlyButton ? (
        <div className="w-full gap-1 rounded-lg text-sm font-medium leading-none md:flex">
          <div className="items-center truncate p-2 md:max-w-[300px]">
            <p className="text-center md:text-left">{domainWithoutHttps}</p>
          </div>
          <div className="ml-auto flex items-center justify-center gap-1 md:justify-start">
            <Button
              variant="icon"
              StartIcon={isCopied ? "check" : "copy"}
              size="sm"
              onClick={() => copyToClipboard(dynamicLinkOfSelectedUsers)}
              color="secondary">
              <span className="sr-only">{!isCopied ? t("copy") : t("copied")}</span>
            </Button>
            <Button
              color="secondary"
              EndIcon="external-link"
              size="sm"
              href={dynamicLinkOfSelectedUsers}
              target="_blank"
              rel="noopener noreferrer">
              Open
            </Button>
          </div>
        </div>
      ) : onlyButton ? (
        <Button
          color="secondary"
          EndIcon="external-link"
          size="sm"
          onClick={() => copyToClipboard(dynamicLinkOfSelectedUsers)}
          target="_blank"
          rel="noopener noreferrer">
          {t("copy")}
        </Button>
      ) : null}
    </>
  );
}
