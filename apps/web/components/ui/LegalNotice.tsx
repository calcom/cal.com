import { useIsEmbed } from "@calcom/embed-core/src/embed-iframe";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

const LegalNotice = () => {
  const { t } = useLocale();
  const isEmbed = useIsEmbed();
  const { data } = trpc.viewer.deploymentSetup.get.useQuery();

  if (isEmbed) {
    return null;
  }

  if (data === undefined) {
    return null;
  }

  const { imprintLink, privacyLink } = data;

  if (!(imprintLink || privacyLink)) {
    return null;
  }

  return (
    <div className="p-2 text-center text-xs">
      {imprintLink ? (
        <a
          target="_blank"
          href={imprintLink}
          className="text-emphasis opacity-50 hover:opacity-100"
          rel="noreferrer">
          {t("imprint")}
        </a>
      ) : null}
      {imprintLink && privacyLink ? <span className="text-emphasis opacity-50">{" | "}</span> : null}
      {privacyLink ? (
        <a
          target="_blank"
          href={privacyLink}
          className="text-emphasis opacity-50 hover:opacity-100"
          rel="noreferrer">
          {t("privacy")}
        </a>
      ) : null}
    </div>
  );
};

export default LegalNotice;
