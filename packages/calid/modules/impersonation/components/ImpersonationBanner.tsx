import type { SessionContextValue } from "next-auth/react";
import { signIn, signOut } from "next-auth/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TopBanner } from "@calcom/ui/components/top-banner";

export type ImpersonationBannerProps = {
  data: SessionContextValue["data"];
};

function ImpersonationBanner({ data }: ImpersonationBannerProps) {
  const { t } = useLocale();

  const impersonator = data?.user.impersonatedBy;
  if (!impersonator) return null;

  const isAdminOrOrgUser = impersonator.role === "ADMIN" || !!data.user?.org?.id;

  const handleStopImpersonation = (e: React.FormEvent) => {
    e.preventDefault();
    signIn("impersonation-auth", { returnToId: impersonator.id });
  };

  const handleStopImpersonationForNormalUser = (e: React.FormEvent) => {
    e.preventDefault();
    signOut({ callbackUrl: "/auth/logout" });
  };

  const actionButton = isAdminOrOrgUser ? (
    <form onSubmit={handleStopImpersonation}>
      <button type="submit" className="text-emphasis hover:underline" data-testid="stop-impersonating-button">
        {t("impersonating_stop_instructions")}
      </button>
    </form>
  ) : (
    <form onSubmit={handleStopImpersonationForNormalUser}>
      <button type="submit" className="text-emphasis hover:underline" data-testid="stop-impersonating-button">
        {t("impersonating_stop_instructions")}
      </button>
    </form>
  );

  return (
    <TopBanner
      text={t("impersonating_user_warning", { user: data.user.username })}
      variant="warning"
      actions={actionButton}
    />
  );
}

export default ImpersonationBanner;
