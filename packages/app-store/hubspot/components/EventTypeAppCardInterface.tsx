import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { InputField } from "@calcom/ui/components/form";
import { Switch } from "@calcom/ui/components/form";
import { Section } from "@calcom/ui/components/section";
import { showToast } from "@calcom/ui/components/toast";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  const pathname = usePathname();
  const { t } = useLocale();

  const { getAppData, setAppData } = useAppContextWithSchema<typeof appDataSchema>();
  const { enabled, updateEnabled } = useIsAppEnabled(app);

  const onBookingWriteToEventObject = getAppData("onBookingWriteToEventObject");
  const onBookingWriteToEventObjectMap = getAppData("onBookingWriteToEventObjectMap") || {};

  const [newOnBookingWriteToEventObjectField, setNewOnBookingWriteToEventObjectField] = useState({
    field: "",
    value: "",
  });

  return (
    <AppCard
      returnTo={`${WEBAPP_URL}${pathname}?tabName=apps`}
      app={app}
      teamId={eventType.team?.id || undefined}
      switchOnClick={(e) => {
        updateEnabled(e);
      }}
      switchChecked={enabled}
      hideAppCardOptions>
      <Section.Content>
        <Section.SubSection>
          <Section.SubSectionHeader icon="badge-check" title={t("on_booking_write_to_event_object")}>
            <Switch
              size="sm"
              labelOnLeading
              checked={onBookingWriteToEventObject}
              onCheckedChange={(checked) => {
                setAppData("onBookingWriteToEventObject", checked);
              }}
            />
          </Section.SubSectionHeader>
          {onBookingWriteToEventObject ? (
            <Section.SubSectionContent>
              <div className="text-subtle flex gap-3 px-3 py-[6px] text-sm font-medium">
                <div className="flex-1">{t("field_name")}</div>
                <div className="flex-1">{t("value")}</div>
                <div className="w-10" />
              </div>
              <Section.SubSectionNested>
                {Object.keys(onBookingWriteToEventObjectMap).map((key) => (
                  <div className="flex items-center gap-2" key={key}>
                    <div className="flex-1">
                      <InputField value={key} readOnly size="sm" className="w-full" />
                    </div>
                    <div className="flex-1">
                      <InputField
                        value={onBookingWriteToEventObjectMap[key]}
                        readOnly
                        size="sm"
                        className="w-full"
                      />
                    </div>
                    <div className="flex w-10 justify-center">
                      <Button
                        StartIcon="x"
                        variant="icon"
                        size="sm"
                        color="minimal"
                        onClick={() => {
                          const newObject = { ...onBookingWriteToEventObjectMap };
                          delete newObject[key];
                          setAppData("onBookingWriteToEventObjectMap", newObject);
                        }}
                      />
                    </div>
                  </div>
                ))}
                <div className="mt-2 flex gap-4">
                  <div className="flex-1">
                    <InputField
                      size="sm"
                      className="w-full"
                      placeholder="Field name"
                      value={newOnBookingWriteToEventObjectField.field}
                      onChange={(e) =>
                        setNewOnBookingWriteToEventObjectField({
                          ...newOnBookingWriteToEventObjectField,
                          field: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <InputField
                      size="sm"
                      className="w-full"
                      placeholder="Value (use {bookingUid} for booking ID)"
                      value={newOnBookingWriteToEventObjectField.value}
                      onChange={(e) =>
                        setNewOnBookingWriteToEventObjectField({
                          ...newOnBookingWriteToEventObjectField,
                          value: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="w-10" />
                </div>
              </Section.SubSectionNested>
              <Button
                className="text-subtle mt-2 w-fit"
                size="sm"
                color="secondary"
                disabled={
                  !(newOnBookingWriteToEventObjectField.field && newOnBookingWriteToEventObjectField.value)
                }
                onClick={() => {
                  if (
                    Object.keys(onBookingWriteToEventObjectMap).includes(
                      newOnBookingWriteToEventObjectField.field.trim()
                    )
                  ) {
                    showToast("Field already exists", "error");
                    return;
                  }

                  setAppData("onBookingWriteToEventObjectMap", {
                    ...onBookingWriteToEventObjectMap,
                    [newOnBookingWriteToEventObjectField.field.trim()]:
                      newOnBookingWriteToEventObjectField.value.trim(),
                  });
                  setNewOnBookingWriteToEventObjectField({ field: "", value: "" });
                }}>
                {t("add_new_field")}
              </Button>
            </Section.SubSectionContent>
          ) : null}
        </Section.SubSection>
      </Section.Content>
    </AppCard>
  );
};

export default EventTypeAppCard;
