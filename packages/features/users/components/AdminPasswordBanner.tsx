import { useSession } from "next-auth/react";
import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TopBanner } from "@calcom/ui";
import { trpc } from "@calcom/trpc/react";

function AdminPasswordBanner() {
  const { t } = useLocale();
  const { data } = useSession();
  const { data: user, isLoading } = trpc.viewer.me.useQuery();

  if (data?.user.role !== "INACTIVE_ADMIN") return null;

  return (
    <>
      <TopBanner
       text={user?.twoFactorEnabled ? t("invalid_admin_password", { user: data.user.username }) : t("invalid_admin_password_and_no_2FA", { user: data.user.username }) }
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
