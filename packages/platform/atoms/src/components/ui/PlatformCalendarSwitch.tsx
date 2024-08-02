import { useState } from "react";

import type { ICalendarSwitchProps } from "@calcom/features/calendars/CalendarSwitch";
import { CalendarSwitchComponent } from "@calcom/ui";

import { useAddSelectedCalendar } from "../../../hooks/calendars/useAddSelectedCalendar";
import { useRemoveSelectedCalendar } from "../../../hooks/calendars/useRemoveSelectedCalendar";
import { AtomsWrapper } from "../../components/atoms-wrapper";
import { Switch } from "./switch";

const PlatformCalendarSwitch = (props: ICalendarSwitchProps) => {
  const { isChecked, title, credentialId, type, externalId } = props;
  const [checkedInternal, setCheckedInternal] = useState(isChecked);

  // add toasts here
  const { mutate: addSelectedCalendar, isPending: isAddingSelectedCalendar } = useAddSelectedCalendar({
    onError: (err) => {
      console.log(`Something went wrong when toggling "${title}"`);
    },
  });
  const { mutate: removeSelectedCalendar, isPending: isRemovingSelectedCalendar } = useRemoveSelectedCalendar(
    {}
  );

  const toggleSelectedCalendars = async ({
    isOn,
    credentialId,
    integration,
    externalId,
  }: {
    isOn: boolean;
    credentialId: number;
    integration: string;
    externalId: string;
  }) => {
    if (isOn) {
      await addSelectedCalendar({ credentialId, integration, externalId });
    } else {
      await removeSelectedCalendar({ credentialId, integration, externalId });
    }
  };

  return (
    <AtomsWrapper>
      <div>
        <CalendarSwitchComponent
          Switch={
            <Switch
              checked={checkedInternal}
              id={externalId}
              onCheckedChange={async () => {
                setCheckedInternal((prevValue) => !prevValue);
                await toggleSelectedCalendars({
                  isOn: !checkedInternal,
                  credentialId,
                  externalId,
                  integration: type,
                });
              }}
            />
          }
          destination={props.destination}
          {...props}
          isChecked={checkedInternal}
          isLoading={isAddingSelectedCalendar || isRemovingSelectedCalendar}
        />
      </div>
    </AtomsWrapper>
  );
};

export { PlatformCalendarSwitch };
