import Exchange2013CalendarInstallAppButton from "./exchange2013calendar/components/InstallAppButton";
import Exchange2016CalendarInstallAppButton from "./exchange2016calendar/components/InstallAppButton";
import Office365VideoInstallAppButton from "./office365video/components/InstallAppButton";
import VitalInstallAppButton from "./vital/components/InstallAppButton";

export const InstallAppButtonMap = {
  exchange2013calendar: Exchange2013CalendarInstallAppButton,
  exchange2016calendar: Exchange2016CalendarInstallAppButton,
  office365video: Office365VideoInstallAppButton,
  vital: VitalInstallAppButton,
};
