import { ProBadge } from "@calid/features/modules/claim-pro/ProBadge";
import { Button } from "@calid/features/ui/components/button";
import ProductHuntBadge from "@calid/features/ui/components/producthunt";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  CALID_VERSION,
  COMPANY_NAME,
  WEBSITE_PRIVACY_POLICY_URL,
  WEBSITE_TERMS_URL,
} from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

const CalIDVersion = `v${CALID_VERSION}`;

export default function BottomNav() {
  const { t } = useLocale();
  const [hasMounted, setHasMounted] = useState(false);
  const { data: user } = useMeQuery();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <div className="text-default flex hidden pb-4 text-xs lg:block">
      <div className="mb-1.5">
        <Button
          color="minimal"
          StartIcon="external-link"
          onClick={() => window.open(`${window.location.origin}/${user?.username}`, "_blank")}
          className="hover:bg-emphasis mb-1.5 w-full border-none">
          {t("view_public_page")}
        </Button>
        <ProductHuntBadge />
      </div>
      {user?.metadata?.isProUser?.yearClaimed > 0 && user?.metadata?.isProUser?.verified && (
        <ProBadge
          yearClaimed={user.metadata.isProUser.yearClaimed}
          validTillDate={user.metadata.isProUser.validTillDate}
        />
      )}
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
