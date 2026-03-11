import { useRouter } from "next/navigation";

import { type InvalidAppCredentialBannerProps } from "@calcom/features/users/types/invalidAppCredentials";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { type RouterOutputs } from "@calcom/trpc/react";
import { TopBanner } from "@calcom/ui/components/top-banner";

export type InvalidAppCredentialBannersProps = {
  data: RouterOutputs["viewer"]["me"]["getUserTopBanners"]["invalidAppCredentialBanners"];
};

export function InvalidAppCredentialBanners({ data }: InvalidAppCredentialBannersProps) {
  if (data.length === 0) {
    return null; // No need to show banner if the array is empty
  }

  return (
    <div>
      {data.map((app) => (
        <InvalidAppCredentialBanner key={app.slug} name={app.name} slug={app.slug} />
      ))}
    </div>
  );
}

export type { InvalidAppCredentialBannerProps };

export function InvalidAppCredentialBanner({ name, slug }: InvalidAppCredentialBannerProps) {
  const { t } = useLocale();
  const router = useRouter();

  const handleClick = () => {
    router.push(`/apps/${slug}`);
  };

  return (
    <TopBanner
      text={` ${t("invalid_credential", { appName: name })} `}
      variant="warning"
      actions={
        <button className="border-b border-b-black" onClick={handleClick}>
          {t("invalid_credential_action")}
        </button>
      }
    />
  );
}
