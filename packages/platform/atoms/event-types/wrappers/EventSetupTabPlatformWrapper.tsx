import {
  EventSetupTab,
  type EventSetupTabWrapperProps,
} from "@calcom/features/eventtypes/components/tabs/setup/EventSetupTab";

const EventSetupTabPlatformWrapper = (props: EventSetupTabWrapperProps) => {
  return (
    <EventSetupTab
      {...props}
      urlPrefix=""
      hasOrgBranding={false}
      isPlatform={true}
    />
  );
};

export default EventSetupTabPlatformWrapper;
