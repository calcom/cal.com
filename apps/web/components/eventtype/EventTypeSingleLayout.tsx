import { EventTypeInfered } from "pages/event-types/[type]";

import { Icon } from "@calcom/ui/Icon";
import { VerticalTabItemProps, VerticalTabs } from "@calcom/ui/v2/navigation/tabs";

type Props = {
  children: React.ReactNode;
  eventType: EventTypeInfered;
};

function EventTypeSingleLayout({ children, eventType }: Props) {
  const EventTypeTabs: VerticalTabItemProps[] = [
    {
      name: "event_tab_setup",
      href: `/event-types/${eventType.id}/setup`, // Default route for eventtype ID
      icon: Icon.FiLink,
      info: `${eventType.length}, Location`, // TODO: Get this from props
    },
  ];

  return (
    <div className="flex space-x-8">
      <VerticalTabs tabs={EventTypeTabs} />
      <div className="w-full  ltr:mr-2 rtl:ml-2 lg:w-9/12">
        <div className="-mx-4 rounded-md border border-neutral-200 bg-white p-6 sm:mx-0 sm:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}

export { EventTypeSingleLayout };
