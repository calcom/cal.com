"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { Icon } from "@calcom/ui/components/icon";
import { Logo } from "@calcom/ui/components/logo";

import { useWelcomeModal } from "../hooks/useWelcomeModal";

const features = [
  "1_parent_team_unlimited_subteams",
  "organization_workflows",
  "custom_subdomain",
  "instant_meetings",
  "collective_round_robin_events",
  "routing_forms",
  "team_workflows",
];

export function WelcomeToOrganizationsModal() {
  const { t } = useLocale();
  const { isOpen, closeModal } = useWelcomeModal();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent size="default" className="max-w-[400px] rounded-2xl" type="">
        {/* Header with logo and illustration */}
        <div className="flex flex-col gap-6">
          {/* Cal.com logo */}
          <div className="flex flex-col items-center gap-1">
            <Logo className="h-10 w-auto" />
          </div>

          {/* Team illustration - simplified with user icons in circular pattern */}
          <div className="relative flex h-32 items-center justify-center">
            <div className="relative flex h-full w-full items-center justify-center">
              {/* Central users icon (larger) */}
              <div className="from-default to-muted border-subtle absolute flex h-12 w-12 items-center justify-center rounded-full border bg-gradient-to-b shadow-sm">
                <Icon name="users" className="text-emphasis h-7 w-7 opacity-70" />
              </div>

              {/* Surrounding user icons */}
              {[0, 1, 2, 3].map((index) => {
                const angle = (index * Math.PI) / 2;
                const radius = 55;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                return (
                  <div
                    key={index}
                    className="bg-muted border-subtle absolute flex h-7 w-7 items-center justify-center rounded-full border shadow-sm"
                    style={{
                      transform: `translate(${x}px, ${y}px)`,
                    }}>
                    <Icon name="user" className="text-default h-4 w-4" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Title and description */}
          <div className="flex flex-col gap-2 text-left">
            <h2 className="font-cal text-emphasis text-2xl leading-none">{t("welcome_to_organizations")}</h2>
            <p className="text-default text-sm leading-normal">{t("organizations_welcome_description")}</p>
          </div>

          {/* Features list */}
          <div className="flex flex-col gap-3">
            {features.map((feature) => (
              <div key={feature} className="flex items-start gap-2">
                <Icon name="check" className="text-muted mt-0.5 h-4 w-4 flex-shrink-0" />
                <span className="text-default text-sm font-medium leading-tight">{t(feature)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-muted border-subtle -mx-8 mt-6 flex items-center justify-between rounded-b-2xl border-t px-8 py-6">
          <Button
            color="minimal"
            href="https://cal.com/docs/organizations"
            target="_blank"
            EndIcon="external-link"
            className="pointer-events-none opacity-0">
            {t("learn_more")}
          </Button>
          <Button color="primary" onClick={closeModal}>
            {t("continue")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
