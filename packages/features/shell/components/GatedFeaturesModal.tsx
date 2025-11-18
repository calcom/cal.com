import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { useGatedFeaturesModal } from "../hooks/useGatedFeaturesModal";
import { Button } from "@calcom/ui/components/button";

const features = [
  "1_parent_team_unlimited_subteams",
  "organization_workflows",
  "custom_subdomain",
  "instant_meetings",
  "collective_round_robin_events",
  "routing_forms",
  "team_workflows",
];

export function GatedFeaturesModal() {
  const { t } = useLocale();
  const { closeModal, isOpen, data } = useGatedFeaturesModal();

  if (!data) {
    return null;
  }

  const { badgeText, description, image, title } = data;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="!p-0" style={{ maxWidth: "400px" }}>
        <div className="p-6">
          <img src={image} alt={title} className="w-full h-36 mb-5" />
          <div className="p-1 text-xs bg-emphasis rounded-md w-fit mb-3 leading-3">{t(badgeText)}</div>

          <div className="mb-5 flex flex-col gap-2">
            <div className="text-xl font-semibold text-emphasis leading-6">{t(title)}</div>
            <div className="text-xs text-default">{t(description)}</div>
          </div>
          <div className="flex flex-col gap-1 ml-6 text-sm text-default font-semibold">
            {features.map((feature) => (
              <ul key={feature} className="list-disc">
                <li>{t(feature)}</li>
              </ul>
            ))}
          </div>
        </div>
        <div className="w-full bg-muted border-subtle flex items-center justify-end rounded-b-2xl border-t px-6 py-5 gap-2">
          <Button color="minimal">{t("dismiss")}</Button>
          <Button color="secondary">{t("learn_more")}</Button>
          <Button color="primary">{t("upgrade")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
