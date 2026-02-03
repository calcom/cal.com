import { ProBadge } from "@calid/features/modules/claim-pro/ProBadge";
import { Icon } from "@calid/features/ui/components/icon/Icon";
import ProductHuntBadge from "@calid/features/ui/components/producthunt";
import { triggerToast } from "@calid/features/ui/components/toast";
import { Tooltip } from "@calid/features/ui/components/tooltip";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  CALID_VERSION,
  COMPANY_NAME,
  WEBSITE_PRIVACY_POLICY_URL,
  WEBSITE_TERMS_URL,
} from "@calcom/lib/constants";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

const CalIDVersion = `v${CALID_VERSION}`;

export default function BottomNav() {
  const { t } = useLocale();
  const [hasMounted, setHasMounted] = useState(false);
  const { data: user } = useMeQuery();
  const { copyToClipboard } = useCopy();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <div className="text-default flex hidden pb-4 text-xs lg:block">
      <div className="mb-1.5">
        <div
          className="hover:bg-emphasis mb-1.5 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5"
          onClick={() => {
            window.open(`${window.location.origin}/${user?.username}`, "_blank");
          }}>
          <Tooltip content={t("preview")}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`${window.location.origin}/${user?.username}`, "_blank");
              }}
              className="cursor-pointer transition-opacity hover:opacity-70">
              <Icon name="external-link" className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content={t("copy")}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(`${window.location.origin}/${user?.username}`, {
                  onSuccess: () => {
                    triggerToast(t("link_copied"), "success");
                  },
                });
              }}
              className="cursor-pointer transition-opacity hover:opacity-70">
              <Icon name="copy" className="h-4 w-4" />
            </button>
          </Tooltip>
          <span className="text-default text-sm font-medium">{t("view_public_page")}</span>
        </div>
        {user?.metadata?.isProUser?.yearClaimed > 0 && user?.metadata?.isProUser?.verified && (
          <ProBadge
            yearClaimed={user.metadata.isProUser.yearClaimed}
            validTillDate={user.metadata.isProUser.validTillDate}
          />
        )}
        <ProductHuntBadge />
      </div>
      <div className="flex justify-between">
        <Link href={WEBSITE_PRIVACY_POLICY_URL} target="_blank" className="hover:underline">
          {t("privacy_policy")}
        </Link>
        •
        <Link href={WEBSITE_TERMS_URL} target="_blank" className="hover:underline">
          {t("terms_of_service")}
        </Link>
      </div>
      <div className="flex justify-center">
        <small className="mt-1 items-center">
          &copy; {new Date().getFullYear()}{" "}
          <Link href="https://onehash.ai" target="_blank" className="hover:underline">
            {COMPANY_NAME}
          </Link>{" "}
          {hasMounted && (
            <>
              <Link
                href="https://github.com/onehashai/Cal-Id/releases"
                target="_blank"
                className="hover:underline">
                {CalIDVersion}
              </Link>
            </>
          )}
        </small>
      </div>
    </div>
  );
}
