import { useState } from "react";

import type { ICalendarSwitchProps } from "@calcom/features/calendars/CalendarSwitch";
import { CalendarSwitchComponent } from "@calcom/ui";

const PlatformCalendarSwitch = (props: ICalendarSwitchProps) => {
  const { isChecked, title, credentialId, type, externalId } = props;
  const [checkedInternal, setCheckedInternal] = useState(isChecked);

  return (
    <CalendarSwitchComponent
      {...props}
      isChecked={checkedInternal}
      // (note): isLoading will come from isPending of the react query mutation
      isLoading={false}
      onCheckedChange={async (isOn: boolean) => {
        setCheckedInternal(isOn);
        // await mutation.mutate({ isOn });
      }}
    />
  );
};

export { PlatformCalendarSwitch };
