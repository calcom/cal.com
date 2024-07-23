import { useState } from "react";

import type { ICalendarSwitchProps } from "@calcom/features/calendars/CalendarSwitch";
import { CalendarSwitchComponent } from "@calcom/ui";

import { AtomsWrapper } from "../../components/atoms-wrapper";
import { Switch } from "./switch";

const PlatformCalendarSwitch = (props: ICalendarSwitchProps) => {
  const { isChecked, title, credentialId, type, externalId } = props;
  const [checkedInternal, setCheckedInternal] = useState(isChecked);

  return (
    <AtomsWrapper>
      <div>
        <CalendarSwitchComponent
          Switch={
            <Switch
              id={externalId}
              onCheckedChange={() => {
                console.log("toggle on/off");
              }}
            />
          }
          {...props}
          isChecked={checkedInternal}
          // (note): isLoading will come from isPending of the react query mutation
          isLoading={false}
        />
      </div>
    </AtomsWrapper>
  );
};

export { PlatformCalendarSwitch };
