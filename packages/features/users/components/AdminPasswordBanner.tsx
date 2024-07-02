import type { SessionContextValue } from "next-auth/react";
import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TopBanner } from "@calcom/ui";

export type AdminPasswordBannerProps = { data: SessionContextValue["data"] };

function AdminPasswordBanner({ data }: AdminPasswordBannerProps) {
  const { t } = useLocale();

  if (data?.user.role !== "INACTIVE_ADMIN") return null;

  return (
    <>
      <TopBanner
        text={t("invalid_admin_password", { user: data.user.username })}
        variant="warning"
        actions={
          <Link href="/settings/security/password" className="border-b border-b-black">
            {t("change_password_admin")}
          </Link>
        }
      />
    </>
  );
}

export default AdminPasswordBanner;
