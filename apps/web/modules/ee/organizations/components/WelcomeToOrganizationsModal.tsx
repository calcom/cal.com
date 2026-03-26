"use client";

import { motion } from "framer-motion";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { Icon, type IconName } from "@calcom/ui/components/icon";
import { Logo } from "@calcom/ui/components/logo";

import { useWelcomeModal } from "@calcom/web/modules/ee/organizations/hooks/useWelcomeModal";

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
  const RINGS = [60, 95, 130]; // Ring radii in px
  const RING_STROKE = 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent size="default" className="flex max-h-[95vh] flex-col !p-0" enableOverflow>
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-col items-center gap-1">
              <Logo className="h-10 w-auto" />
            </div>

            {/* Team illustration with rings */}
            <div
              className="relative mx-auto"
              style={{
                width: 320,
                height: 220,
                maskImage: "radial-gradient(ellipse 100% 60% at center, black 30%, transparent 85%)",
                WebkitMaskImage: "radial-gradient(ellipse 100% 60% at center, black 30%, transparent 85%)",
              }}>
              {/* Center origin */}
              <div className="absolute left-1/2 top-1/2" style={{ transform: "translate(-50%, -50%)" }}>
                {/* Rings */}
                {RINGS.map((r, i) => (
                  <div
                    key={i}
                    className="pointer-events-none absolute rounded-full border"
                    style={{
                      width: 2 * r,
                      height: 2 * r,
                      left: `calc(50% - ${r}px)`,
                      top: `calc(50% - ${r}px)`,
                      borderWidth: RING_STROKE,
                      borderColor: "var(--cal-border-subtle)",
                    }}
                  />
                ))}

                {/* Central users icon  */}
                <div
                  className="from-default to-muted border-subtle absolute flex items-center justify-center rounded-full border bg-gradient-to-b shadow-sm"
                  style={{
                    width: LARGE.outer,
                    height: LARGE.outer,
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}>
                  <Icon
                    name="users"
                    className="text-emphasis opacity-70"
                    style={{ width: LARGE.icon, height: LARGE.icon }}
                  />
                </div>

                {/* Surrounding user icons */}
                {(
                  [
                    { initialDeg: 30, duration: 20, icon: "user" },
                    { initialDeg: 190, duration: 25, icon: "user" },
                    { initialDeg: 320, duration: 15, icon: "user" },
                    { initialDeg: 280, duration: 20, icon: "building" },
                  ] as Array<{ initialDeg: number; duration: number; icon: IconName }>
                ).map(({ initialDeg, duration, icon }, index) => {
                  const r = RINGS[index % RINGS.length]; // icon orbit radius - each icon on a different ring (we have more icons than ring so we cycle through them)
                  const steps = 60;
                  const xKeyframes = [];
                  const yKeyframes = [];
                  for (let i = 0; i <= steps; i++) {
                    const angle = initialDeg + (360 * i) / steps;
                    xKeyframes.push(r * Math.cos((angle * Math.PI) / 180));
                    yKeyframes.push(r * Math.sin((angle * Math.PI) / 180));
                  }

                  return (
                    <motion.div
                      key={index}
                      className="from-default to-muted border-subtle absolute flex items-center justify-center rounded-full border bg-gradient-to-b shadow-sm"
                      style={{
                        left: "50%",
                        top: "50%",
                        width: SMALL.outer,
                        height: SMALL.outer,
                      }}
                      animate={{
                        x: xKeyframes,
                        y: yKeyframes,
                      }}
                      transition={{
                        duration,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      transformTemplate={({ x, y }) =>
                        // Lock the icon to the center of the ring and only translate on x and y
                        `translate(-50%, -50%) translateX(${x}) translateY(${y})`
                      }>
                      <Icon
                        name={icon}
                        className="text-default"
                        style={{ width: SMALL.icon, height: SMALL.icon }}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="mb-2 flex flex-col gap-2 text-center">
              <h2 className="font-cal text-emphasis text-2xl leading-none">
                {t("welcome_to_organizations")}
              </h2>
              <p className="text-default text-sm leading-normal">{t("organizations_welcome_description")}</p>
            </div>

            <div className="mb-2 flex flex-col gap-3">
              {features.map((feature) => (
                <div key={feature} className="flex items-start gap-2">
                  <Icon name="check" className="text-muted mt-0.5 h-4 w-4 shrink-0" />
                  <span className="text-default text-sm font-medium leading-tight">{t(feature)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-muted border-subtle flex shrink-0 items-center justify-between rounded-b-2xl border-t px-8 py-6">
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
