import { usePathname } from "next/navigation";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { FieldMappingInput } from "@calcom/ui/components/form";
import { Switch } from "@calcom/ui/components/form";
import { Section } from "@calcom/ui/components/section";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  const pathname = usePathname();
  const { t } = useLocale();

  const { getAppData, setAppData } = useAppContextWithSchema<typeof appDataSchema>();
  const { enabled, updateEnabled } = useIsAppEnabled(app);

  const onBookingWriteToEventObject = getAppData("onBookingWriteToEventObject");
  const onBookingWriteToEventObjectMap = getAppData("onBookingWriteToEventObjectMap") || {};

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
            <FieldMappingInput
              fieldMappings={onBookingWriteToEventObjectMap}
              onFieldMappingsChange={(mappings) => setAppData("onBookingWriteToEventObjectMap", mappings)}
              fieldValuePlaceholder="Value (use {bookingUid} for booking ID)"
            />
          ) : null}
        </Section.SubSection>
      </Section.Content>
    </AppCard>
  );
};

export default EventTypeAppCard;
