import { BookerStoreProvider } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { CalendarViewComponent } from "../CalendarViewComponent";
import { EventTypeCalendarViewComponent } from "../EventTypeCalendarViewComponent";

export type CalendarViewPlatformWrapperAtomPropsForIndividual = {
  username: string | string[];
  eventSlug: string;
};

export type CalendarViewPlatformWrapperAtomPropsForTeam = {
  teamId: number;
  eventSlug: string;
};

type EventTypeCalendarViewProps = { isEventTypeView: true } & (
  | (CalendarViewPlatformWrapperAtomPropsForIndividual & { teamId?: number })
  | (CalendarViewPlatformWrapperAtomPropsForTeam & { username?: string | string[] })
);

type CalendarViewComponentProps = {
  isEventTypeView?: false;
};

type CalendarViewProps = EventTypeCalendarViewProps | CalendarViewComponentProps;

const CalendarViewPlatformWrapperComponent = (props: CalendarViewProps) => {
  if (!props.isEventTypeView) {
    return <CalendarViewComponent />;
  }

  return <EventTypeCalendarViewComponent {...props} />;
};

export const CalendarViewPlatformWrapper = (props: CalendarViewProps) => {
  return (
    <BookerStoreProvider>
      <CalendarViewPlatformWrapperComponent {...props} />
    </BookerStoreProvider>
  );
};
