import { useSession } from "next-auth/react";
import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TopBanner } from "@calcom/ui";

function AdminPasswordBanner() {
  const { t } = useLocale();
  const { data } = useSession();

  if (data?.user.role !== "INACTIVE_ADMIN") return null;

  return (
    <>
      <TopBanner
        text={t("invalid_admin_password", { user: data.user.username })}
        variant="warning"
        actions={
          <Link href="/settings/security/password">
            <a className="border-b border-b-black">{t("change_password_admin")}</a>
          </Link>
        }
      />
    </>
  );
}

export default AdminPasswordBanner;
