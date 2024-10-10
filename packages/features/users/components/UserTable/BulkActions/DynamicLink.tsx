import type { Table } from "@tanstack/react-table";
import { useQueryState, parseAsBoolean } from "nuqs";

import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

import type { UserTableUser } from "../types";

export function DynamicLink({ table, domain }: { table: Table<UserTableUser>; domain: string }) {
  const { t } = useLocale();
  const [dynamicLinkVisible, _] = useQueryState("dynamicLink", parseAsBoolean);
  const { copyToClipboard, isCopied } = useCopy();
  const numberOfSelectedRows = table.getSelectedRowModel().rows.length;
  const isVisible = numberOfSelectedRows >= 2 && dynamicLinkVisible;

  const users = table
    .getSelectedRowModel()
    .flatRows.map((row) => row.original.username)
    .filter((u) => u !== null);

  const usersNameAsString = users.join("+");

  const dynamicLinkOfSelectedUsers = `${domain}/${usersNameAsString}`;
  const domainWithoutHttps = dynamicLinkOfSelectedUsers.replace(/https?:\/\//g, "");

  return (
    <>
      {isVisible ? (
        <div className="w-full gap-1 rounded-lg text-sm font-medium leading-none md:flex">
          <div className="max-w-[300px] items-center truncate p-2">
            <p>{domainWithoutHttps}</p>
          </div>
          <div className="ml-auto flex items-center">
            <Button StartIcon="copy" size="sm" onClick={() => copyToClipboard(dynamicLinkOfSelectedUsers)}>
              {!isCopied ? t("copy") : t("copied")}
            </Button>
            <Button
              EndIcon="external-link"
              size="sm"
              href={dynamicLinkOfSelectedUsers}
              target="_blank"
              rel="noopener noreferrer">
              Open
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
