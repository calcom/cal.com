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

  const SMALL = { outer: 32, icon: 16 };
  const LARGE = { outer: 48, icon: 24 };

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
              <div
                className="from-default to-muted border-subtle absolute flex items-center justify-center rounded-full border bg-gradient-to-b shadow-sm"
                style={{ width: LARGE.outer, height: LARGE.outer }}>
                <Icon
                  name="users"
                  className="text-emphasis opacity-70"
                  style={{ width: LARGE.icon, height: LARGE.icon }}
                />
              </div>

              {/* Surrounding user icons */}
              {[30, 190, 320].map((deg, index) => {
                const radius = 75;
                const rad = (deg * Math.PI) / 180;
                const x = Math.cos(rad) * radius;
                const y = Math.sin(rad) * radius;

                return (
                  <div
                    key={index}
                    className="from-default to-muted bg-muted border-subtle absolute flex items-center justify-center rounded-full border bg-gradient-to-b shadow-sm"
                    style={{
                      width: SMALL.outer,
                      height: SMALL.outer,
                      transform: `translate(${x}px, ${y}px)`,
                    }}>
                    <Icon
                      name="user"
                      className="text-default"
                      style={{ width: SMALL.icon, height: SMALL.icon }}
                    />
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
