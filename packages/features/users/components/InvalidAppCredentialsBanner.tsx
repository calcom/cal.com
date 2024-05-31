import useAddAppMutation from "@calcom/app-store/_utils/useAddAppMutation";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { type RouterOutputs } from "@calcom/trpc";
import type { App } from "@calcom/types/App";
import { TopBanner } from "@calcom/ui";

export type InvalidAppCredentialBannersProps = {
  data: RouterOutputs["viewer"]["getUserTopBanners"]["invalidAppCredentialBanners"];
};

export function InvalidAppCredentialBanners({ data }: InvalidAppCredentialBannersProps) {
  if (data.length === 0) {
    return null; // No need to show banner if the array is empty
  }

  return (
    <div>
      {data.map((app) => (
        <InvalidAppCredentialBanner teamId={app.teamId} key={app.type} name={app.name} type={app.type} />
      ))}
    </div>
  );
}

export type InvalidAppCredentialBannerProps = {
  name: string;
  teamId?: number;
  type: string;
};

export function InvalidAppCredentialBanner({ name, teamId, type }: InvalidAppCredentialBannerProps) {
  const mutation = useAddAppMutation(null, { teamId: teamId });
  const { t } = useLocale();

  const handleClick = () => {
    mutation.mutate({ type: type as App["type"] });
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
