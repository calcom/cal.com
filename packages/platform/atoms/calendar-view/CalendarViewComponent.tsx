import { Header } from "@calcom/features/bookings/components/Header";
import { BookerSection } from "@calcom/features/bookings/components/Section";
import { LargeCalendar } from "@calcom/web/modules/calendar-view/components/LargeCalendar";
import { bookerLayoutOptions } from "@calcom/prisma/zod-utils";

import { AtomsWrapper } from "../src/components/atoms-wrapper";

export const CalendarViewComponent = () => {
  return (
    <AtomsWrapper>
      <BookerSection area="header" className="bg-default dark:bg-muted sticky top-0 z-10">
        <Header
          isCalendarView={true}
          isMyLink={true}
          eventSlug="calendar-view"
          enabledLayouts={bookerLayoutOptions}
          extraDays={7}
          isMobile={false}
          nextSlots={6}
        />
      </BookerSection>
      <BookerSection
        key="large-calendar"
        area="main"
        visible={true}
        className="border-subtle sticky top-0 ml-px h-full md:border-l">
        <LargeCalendar extraDays={7} isLoading={false} />
      </BookerSection>
    </AtomsWrapper>
  );
};
