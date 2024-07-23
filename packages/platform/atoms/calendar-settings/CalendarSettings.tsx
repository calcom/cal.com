import { CalendarSwitch } from "@calcom/features/calendars/CalendarSwitch";

export const CalendarSettings = () => {
  return (
    <div>
      <CalendarSwitch
        title="Croatia 2024"
        type="apple_calendar"
        isChecked={true}
        name="Croatia 2024"
        externalId="https://caldav.icloud.com/20961146906/calendars/1644411A-1945-4248-BBC0-4F0F23B97A7E/"
        credentialId={25}
      />
    </div>
  );
};
