import { QueryCell } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CalendarSettingsComponent } from "@calcom/ui";

import { useConnectedCalendars } from "../../hooks/useConnectedCalendars";
import { AtomsWrapper } from "../../src/components/atoms-wrapper";

// put code of calendarSwitchPlatform and DisconnectButtonPlatform here

export const CalendarSettingsPlatformWrapper = () => {
  const { t } = useLocale();
  const query = useConnectedCalendars({});

  return (
    <AtomsWrapper>
      <QueryCell
        query={query}
        success={({ data }) => {
          if (!data.connectedCalendars.length) {
            return null;
          }

          console.log(data, "dataaaa".toLocaleUpperCase());

          console.log(data.connectedCalendars, "these are a users connected calendars");

          return (
            <CalendarSettingsComponent
              destinationCalendarId={String(data.destinationCalendar.id)}
              connectedCalendars={data.connectedCalendars}
              onChanged={() => {
                console.log("changing");
              }}>
              {/* {data.connectedCalendars.map((connectedCalendar) => {
                return <ConnectedCalendarSettings slug={connectedCalendar.integration.slug} actions={() => <DisconnectButton slug={connectedCalendar.calendar ? slug : undefined}} >
                   {items.calendars.map(selectedCalendar =>  <CalendarSwitch id={selectedCalendar.id} />)}
                    <ConnectedCalendarSettings />
              })} */}
            </CalendarSettingsComponent>
          );
        }}
      />
    </AtomsWrapper>
  );
};

// () => JSX.Element
// <CalendarSettings>
//   {/* This is the dumb component */}
//   <ConnectedCalendarComponent DisconnectIntegration={() => <div>Should render disconnect integration</div>} />
// </CalendarSettings>;

// calendar settings takes in a children prop, it would only be one child
