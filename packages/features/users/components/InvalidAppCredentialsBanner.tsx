import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { type RouterOutputs, trpc } from "@calcom/trpc";
import { TopBanner, showToast } from "@calcom/ui";

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
        <InvalidAppCredentialBanner
          teamId={app.teamId}
          id={app.id}
          key={app.slug}
          name={app.name}
          slug={app.slug}
        />
      ))}
    </div>
  );
}

export type InvalidAppCredentialBannerProps = {
  id: number;
  name: string;
  slug: string;
  teamId?: number;
};

export function InvalidAppCredentialBanner({ name, slug, id, teamId }: InvalidAppCredentialBannerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const mutation = trpc.viewer.deleteCredential.useMutation({
    onSuccess: () => {
      showToast(t("app_removed_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_removing_app"), "error");
    },
    async onSettled() {
      await utils.viewer.connectedCalendars.invalidate();
      await utils.viewer.integrations.invalidate();
    },
  });

  const handleClick = () => {
    mutation.mutate({ id, teamId });
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
