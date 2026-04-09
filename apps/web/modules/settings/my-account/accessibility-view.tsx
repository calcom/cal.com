"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Radio, RadioGroup, RadioIndicator, RadioLabel } from "@calcom/ui/components/radio";
import { showToast } from "@calcom/ui/components/toast";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";

type DeafHearingValue = "deaf" | "hard_of_hearing" | "late_deaf";

const deafHearingOptions: { value: DeafHearingValue; labelKey: string; id: string }[] = [
  { value: "deaf", labelKey: "accessibility_deaf_option_deaf", id: "accessibility-deaf-deaf" },
  {
    value: "hard_of_hearing",
    labelKey: "accessibility_deaf_option_hard_of_hearing",
    id: "accessibility-deaf-hard-of-hearing",
  },
  { value: "late_deaf", labelKey: "accessibility_deaf_option_late_deaf", id: "accessibility-deaf-late-deaf" },
];

const sectionHashLinks: {
  hash: string;
  labelKey:
    | "accessibility_section_deaf"
    | "accessibility_section_blind"
    | "accessibility_section_adhd"
    | "accessibility_section_dyslexia";
}[] = [
  { hash: "#accessibility-deaf-heading", labelKey: "accessibility_section_deaf" },
  { hash: "#accessibility-blind-heading", labelKey: "accessibility_section_blind" },
  { hash: "#accessibility-adhd-heading", labelKey: "accessibility_section_adhd" },
  { hash: "#accessibility-dyslexia-heading", labelKey: "accessibility_section_dyslexia" },
];

const getDeafHearingFromUser = (
  user: RouterOutputs["viewer"]["me"]["get"] | undefined
): DeafHearingValue | undefined => {
  if (!user?.metadata) return undefined;
  const parsed = userMetadata.safeParse(user.metadata);
  if (!parsed.success) return undefined;
  return parsed.data?.deafHearingIdentity;
};

const AccessibilityView = (): ReactElement => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const { data: user, isPending: isUserLoading } = trpc.viewer.me.get.useQuery();

  const savedIdentity = useMemo(() => getDeafHearingFromUser(user), [user]);

  const [deafHearingIdentity, setDeafHearingIdentity] = useState<DeafHearingValue | undefined>(undefined);

  useEffect(() => {
    setDeafHearingIdentity(savedIdentity);
  }, [savedIdentity]);

  const updateProfile = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.viewer.me.invalidate();
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const isDirty = deafHearingIdentity !== savedIdentity;

  const handleDeafHearingChange = (value: string): void => {
    setDeafHearingIdentity(value as DeafHearingValue);
  };

  const handleCancel = (): void => {
    setDeafHearingIdentity(savedIdentity);
  };

  const handleSave = (): void => {
    if (!isDirty || deafHearingIdentity === undefined) return;
    updateProfile.mutate({
      metadata: {
        deafHearingIdentity: deafHearingIdentity,
      },
    });
  };

  return (
    <SettingsHeader
      title={t("accessibility")}
      description={t("accessibility_description")}
      borderInShellHeader={true}>
      <div
        className={classNames(
          "rounded-b-xl border-subtle border-x border-b",
          isUserLoading && "pointer-events-none opacity-60"
        )}>
        <nav
          aria-label={t("accessibility_on_this_page")}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 border-subtle border-b px-6 py-3 text-sm">
          {sectionHashLinks.map((item, index) => (
            <span key={item.hash} className="flex items-center gap-x-3">
              {index > 0 && (
                <span aria-hidden className="text-subtle">
                  ·
                </span>
              )}
              <a
                href={item.hash}
                className="text-default underline-offset-2 hover:text-emphasis hover:underline">
                {t(item.labelKey)}
              </a>
            </span>
          ))}
        </nav>

        {/* Deaf */}
        <section aria-labelledby="accessibility-deaf-heading" className="px-6 py-6">
          <h2
            id="accessibility-deaf-heading"
            className="mb-4 font-semibold text-base text-emphasis leading-6">
            {t("accessibility_section_deaf")}
          </h2>
          <RadioGroup
            className="flex flex-row flex-nowrap items-center gap-x-8 overflow-x-auto pb-1"
            value={deafHearingIdentity}
            onValueChange={handleDeafHearingChange}
            disabled={isUserLoading || updateProfile.isPending}>
            {deafHearingOptions.map((opt) => (
              <div key={opt.value} className="flex shrink-0 items-center gap-3">
                <Radio value={opt.value} id={opt.id}>
                  <RadioIndicator disabled={isUserLoading || updateProfile.isPending} />
                </Radio>
                <RadioLabel
                  htmlFor={opt.id}
                  className="ms-0 w-auto cursor-pointer font-normal text-emphasis text-sm leading-5">
                  {t(opt.labelKey)}
                </RadioLabel>
              </div>
            ))}
          </RadioGroup>
        </section>

        <div className="border-subtle border-t" role="presentation" />

        {/* Blind */}
        <section aria-labelledby="accessibility-blind-heading" className="px-6 py-6">
          <h2
            id="accessibility-blind-heading"
            className="mb-2 font-semibold text-base text-emphasis leading-6">
            {t("accessibility_section_blind")}
          </h2>
          <p className="text-sm text-subtle leading-normal">{t("accessibility_under_construction")}</p>
        </section>

        <div className="border-subtle border-t" role="presentation" />

        {/* ADHD */}
        <section aria-labelledby="accessibility-adhd-heading" className="px-6 py-6">
          <h2
            id="accessibility-adhd-heading"
            className="mb-2 font-semibold text-base text-emphasis leading-6">
            {t("accessibility_section_adhd")}
          </h2>
          <p className="text-sm text-subtle leading-normal">{t("accessibility_under_construction")}</p>
        </section>

        <div className="border-subtle border-t" role="presentation" />

        {/* Dyslexia */}
        <section aria-labelledby="accessibility-dyslexia-heading" className="px-6 py-6">
          <h2
            id="accessibility-dyslexia-heading"
            className="mb-2 font-semibold text-base text-emphasis leading-6">
            {t("accessibility_section_dyslexia")}
          </h2>
          <p className="text-sm text-subtle leading-normal">{t("accessibility_under_construction")}</p>
        </section>

        <SectionBottomActions align="start" className="gap-2 rounded-b-xl">
          <Button
            color="minimal"
            type="button"
            disabled={!isDirty || isUserLoading || updateProfile.isPending}
            onClick={handleCancel}>
            {t("cancel")}
          </Button>
          <Button
            color="primary"
            type="button"
            loading={updateProfile.isPending}
            disabled={!isDirty || deafHearingIdentity === undefined || isUserLoading}
            onClick={handleSave}>
            {t("save")}
          </Button>
        </SectionBottomActions>
      </div>
    </SettingsHeader>
  );
};

export default AccessibilityView;
