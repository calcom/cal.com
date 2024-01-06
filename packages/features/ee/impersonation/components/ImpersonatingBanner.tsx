import type { SessionContextValue } from "next-auth/react";
import { signIn } from "next-auth/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TopBanner } from "@calcom/ui";

export type ImpersonatingBannerProps = { data: SessionContextValue["data"] };

function ImpersonatingBanner({ data }: ImpersonatingBannerProps) {
  const { t } = useLocale();

  if (!data?.user.impersonatedByUID) return null;
  const returnToId = data.user.impersonatedByUID;

  return (
    <>
      <TopBanner
        text={t("impersonating_user_warning", { user: data.user.username })}
        variant="warning"
        actions={
          <form
            onSubmit={(e) => {
              e.preventDefault();
              signIn("impersonation-auth", { returnToId });
            }}>
            <button className="text-emphasis hover:underline" data-testid="stop-impersonating-button">
              {t("impersonating_stop_instructions")}
            </button>
          </form>
        }
      />
    </>
  );
}

export default ImpersonatingBanner;
