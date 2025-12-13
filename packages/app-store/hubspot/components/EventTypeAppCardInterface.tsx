import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select } from "@calcom/ui/components/form";
import { Switch } from "@calcom/ui/components/form";
import { Section } from "@calcom/ui/components/section";

import { HubspotRecordEnum } from "../lib/enums";
import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({
  app,
  eventType,
  onAppInstallSuccess,
}) {
  const pathname = usePathname();
  const { t } = useLocale();
  const { getAppData, setAppData } = useAppContextWithSchema<typeof appDataSchema>();
  const { enabled, updateEnabled } = useIsAppEnabled(app);

  const ignoreGuests = getAppData("ignoreGuests") ?? false;
  const createEventOn = getAppData("createEventOn") ?? HubspotRecordEnum.CONTACT;
  const skipContactCreation = getAppData("skipContactCreation") ?? false;
  const checkForContact = getAppData("checkForContact") ?? false;

  const recordOptions = [
    { label: t("contact"), value: HubspotRecordEnum.CONTACT },
    { label: t("company"), value: HubspotRecordEnum.COMPANY },
  ];

  const [createEventOnSelectedOption, setCreateEventOnSelectedOption] = useState(
    recordOptions.find((option) => option.value === createEventOn) ?? recordOptions[0]
  );

  return (
    <AppCard
      onAppInstallSuccess={onAppInstallSuccess}
      returnTo={`${WEBAPP_URL}${pathname}?tabName=apps`}
      app={app}
      teamId={eventType.team?.id || undefined}
      switchOnClick={(e) => {
        updateEnabled(e);
      }}
      switchChecked={enabled}
      hideSettingsIcon>
      <Section.Content>
        <Section.SubSection>
          <Section.SubSectionHeader
            icon="zap"
            title={t("create_event_on")}
            justify="start"
            labelFor="create-event-on">
            <Select
              size="sm"
              id="create-event-on"
              className="w-[200px]"
              options={recordOptions}
              value={createEventOnSelectedOption}
              onChange={(e) => {
                if (e) {
                  setCreateEventOnSelectedOption(e);
                  setAppData("createEventOn", e.value);
                }
              }}
            />
          </Section.SubSectionHeader>
        </Section.SubSection>

        <Section.SubSection>
          <Section.SubSectionHeader icon="user-plus" title={t("ignore_guests")} labelFor="ignore-guests">
            <Switch
              size="sm"
              labelOnLeading
              checked={ignoreGuests}
              onCheckedChange={(checked) => {
                setAppData("ignoreGuests", checked);
              }}
            />
          </Section.SubSectionHeader>
        </Section.SubSection>

        {createEventOnSelectedOption.value === HubspotRecordEnum.CONTACT ? (
          <Section.SubSection>
            <Section.SubSectionHeader
              icon="user-plus"
              title={t("skip_contact_creation", { appName: "HubSpot" })}
              labelFor="skip-contact-creation">
              <Switch
                size="sm"
                labelOnLeading
                checked={skipContactCreation}
                onCheckedChange={(checked) => {
                  setAppData("skipContactCreation", checked);
                }}
              />
            </Section.SubSectionHeader>
          </Section.SubSection>
        ) : null}

        {createEventOnSelectedOption.value === HubspotRecordEnum.COMPANY ? (
          <Section.SubSection>
            <Section.SubSectionHeader
              icon="user-plus"
              title={t("check_for_contact")}
              labelFor="check-for-contact">
              <Switch
                size="sm"
                labelOnLeading
                checked={checkForContact}
                onCheckedChange={(checked) => {
                  setAppData("checkForContact", checked);
                }}
              />
            </Section.SubSectionHeader>
          </Section.SubSection>
        ) : null}
      </Section.Content>
    </AppCard>
  );
};

export default EventTypeAppCard;