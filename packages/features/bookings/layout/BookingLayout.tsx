import React, { ComponentProps } from "react";
import create from "zustand";

import { HorizontalTabs, Shell } from "@calcom/ui";
import { VerticalTabItemProps, HorizontalTabItemProps } from "@calcom/ui/v2";

import { EventTypeFilter, IEventTypeFilter } from "../components/EventTypeFilter";
import { TeamsMemberFilter, ITeamMemberFilter } from "../components/TeamsMemberFilter";

const tabs: (VerticalTabItemProps | HorizontalTabItemProps)[] = [
  {
    name: "upcoming",
    href: "/bookings/upcoming",
  },
  {
    name: "unconfirmed",
    href: "/bookings/unconfirmed",
  },
  {
    name: "recurring",
    href: "/bookings/recurring",
  },
  {
    name: "past",
    href: "/bookings/past",
  },
  {
    name: "cancelled",
    href: "/bookings/cancelled",
  },
];

interface BookingLayoutStoreState {
  selectedEventTypes: IEventTypeFilter[];
  selectedUsers: {
    id: number;
    teamName: string;
    user: ITeamMemberFilter["members"][0]["user"];
  }[];
}
interface BookingLayoutStoreActions {
  setSelectedEventTypes: (eventTypes: IEventTypeFilter[]) => void;
  setSelectedUsers: (users: BookingLayoutStoreState["selectedUsers"]) => void;
  pushSelectedEventType: (eventType: IEventTypeFilter) => void;
  pushSelectedUser: (user: BookingLayoutStoreState["selectedUsers"][0]) => void;
  removeSelectedEventType: (eventType: IEventTypeFilter) => void;
  removeSelectedUser: (userId: number) => void;
  clearState: () => void;
}

// Since this is a layout i thought i'd be best to implement some "Global" component state
export const useFilterStore = create<BookingLayoutStoreState & BookingLayoutStoreActions>((set) => ({
  selectedEventTypes: [],
  selectedUsers: [],
  setSelectedEventTypes: (eventTypes) => set({ selectedEventTypes: eventTypes }),
  setSelectedUsers: (users) => set({ selectedUsers: users }),
  pushSelectedEventType: (eventType) => {
    set((state) => ({ selectedEventTypes: [...state.selectedEventTypes, eventType] }));
  },
  pushSelectedUser: (user) => {
    set((state) => ({ selectedUsers: [...state.selectedUsers, user] }));
  },
  removeSelectedEventType: (eventType) => {
    set((state) => ({
      selectedEventTypes: state.selectedEventTypes.filter((type) => type.id !== eventType.id),
    }));
  },
  removeSelectedUser: (userId) => {
    set((state) => {
      return {
        selectedUsers: state.selectedUsers.filter((selected) => selected.user.id !== userId),
      };
    });
  },
  clearState: () => set({ selectedEventTypes: [], selectedUsers: [] }),
}));

export default function BookingLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  return (
    <Shell {...rest}>
      <div className="flex max-w-6xl flex-col sm:space-x-2">
        <div className="flex  flex-col lg:flex-row">
          <HorizontalTabs tabs={tabs} />
          <div className="flex space-x-2">
            {/* <TeamsMemberFilter />
            <EventTypeFilter /> */}
          </div>
        </div>
        <main className="w-full max-w-6xl">{children}</main>
      </div>
    </Shell>
  );
}
export const getLayout = (page: React.ReactElement) => <BookingLayout>{page}</BookingLayout>;
