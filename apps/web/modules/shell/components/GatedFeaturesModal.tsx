import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { Button } from "@calcom/ui/components/button";

import { useGatedFeaturesStore, GatedFeatures } from "../stores/gatedFeaturesStore";

type FeatureContent = {
  badgeText: string;
  title: string;
  image: string;
  description: string;
  features: string[];
  learnMoreUrl: string;
  ctaUrl: string;
};

const content: Record<GatedFeatures, FeatureContent> = {
  roles_and_permissions: {
    badgeText: "roles_and_permissions",
    title: "only_available_on_orgs_plan",
    image: "/gated-features/roles_and_permissions.svg",
    description: "upgrade_team_to_orgs_with_price",
    features: [
      "1_parent_team_unlimited_subteams",
      "attribute_based_routing",
      "compliance_check",
      "and_more_features",
    ],
    learnMoreUrl: "https://cal.com/enterprise",
    ctaUrl: "/settings/organizations/new",
  },
};

export function GatedFeaturesModal() {
  const { t } = useLocale();
  const isOpen = useGatedFeaturesStore((state) => state.isOpen);
  const activeFeature = useGatedFeaturesStore((state) => state.activeFeature);
  const close = useGatedFeaturesStore((state) => state.close);

  const data = activeFeature ? content[activeFeature] : null;

  if (!data) {
    return null;
  }

  const { badgeText, description, image, title, features, learnMoreUrl, ctaUrl } = data;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="p-0!" style={{ maxWidth: "400px" }}>
        <div className="p-6">
          <img src={image} alt={t(title)} className="w-full h-36 mb-5" />
          <div className="p-1 text-xs bg-emphasis rounded-md w-fit mb-3 leading-3">{t(badgeText)}</div>

          <div className="mb-5 flex flex-col gap-2">
            <div className="text-xl font-semibold text-emphasis leading-6">{t(title)}</div>
            <div className="text-sm leading-5 font-normal text-default">{t(description)}</div>
          </div>
          <div className="flex flex-col gap-1 ml-6">
            <ul className="list-disc">
              {features.map((feature) => (
                <li className="text-sm text-default font-medium" key={feature}>
                  {t(feature)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="w-full bg-muted border-subtle flex items-center justify-between rounded-b-2xl border-t px-6 py-5">
          <Button color="minimal" onClick={close}>
            {t("dismiss")}
          </Button>
          <div className="flex gap-2">
            <Button color="secondary" target="_blank" rel="noopener noreferrer" href={learnMoreUrl}>
              {t("learn_more")}
            </Button>
            <Button color="primary" href={ctaUrl}>
              {t("upgrade")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
