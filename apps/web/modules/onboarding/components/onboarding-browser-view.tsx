"use client";

import { Icon } from "@calcom/ui/components/icon";

type OnboardingBrowserViewProps = {
  avatar?: string | null;
  name?: string;
  bio?: string;
  username?: string | null;
};

export const OnboardingBrowserView = ({ avatar, name, bio, username }: OnboardingBrowserViewProps) => {
  return (
    <div className="hidden h-full w-full lg:flex lg:items-start lg:justify-center">
      <div className="sticky top-8 h-full w-full">
        {/* Browser container */}
        <div className="bg-default border-subtle flex flex-col overflow-hidden rounded-l-2xl border">
          {/* Browser header */}
          <div className="border-subtle flex items-center gap-3 border-b bg-white p-3">
            {/* Navigation buttons */}
            <div className="flex items-center gap-4 opacity-50">
              <Icon name="arrow-left" className="text-subtle h-4 w-4" />
              <Icon name="arrow-right" className="text-subtle h-4 w-4" />
              <Icon name="rotate-cw" className="text-subtle h-4 w-4" />
            </div>

            {/* Address bar */}
            <div className="bg-muted flex h-8 flex-1 items-center gap-2 rounded-full px-3">
              <Icon name="lock" className="text-subtle h-3.5 w-3.5" />
              <span className="text-emphasis text-sm font-medium">
                {username ? `cal.com/${username}` : "cal.com/"}
              </span>
            </div>

            {/* User menu */}
            <div className="flex items-center gap-2">
              <div className="bg-subtle border-subtle h-6 w-6 rounded-full border" />
              <Icon name="menu" className="text-subtle h-4 w-4" />
            </div>
          </div>

          {/* Browser content - Booking page preview */}
          <div className="bg-muted flex flex-col gap-3 p-11">
            {/* Action Card */}
            <div className="bg-default border-muted flex flex-col overflow-hidden rounded-xl border">
              {/* First item - Active state */}
              <div className="flex flex-col gap-4 p-4">
                {/* Avatar */}
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name || "Profile"}
                    className="h-16 w-16 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="bg-muted border-muted flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border" />
                )}

                {/* Name and bio */}
                <div className="flex flex-col gap-2">
                  <p className={`font-cal text-xl leading-6 ${name ? "opacity-100" : "opacity-40"}`}>
                    {name || "Team name"}
                  </p>
                  {bio && <p className="text-emphasis text-sm font-medium opacity-100">{bio}</p>}
                  {!bio && <p className="text-emphasis text-sm font-medium opacity-40">Bio</p>}
                </div>
              </div>

              {/* Event type items */}
              <div className="flex flex-col opacity-30">
                {/* Demo event */}
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <p className="text-emphasis text-sm font-semibold leading-4">Demo</p>
                      <div className="bg-emphasis flex h-4 items-center gap-1 rounded-md px-1">
                        <Icon name="bell" className="text-emphasis h-3 w-3" />
                        <span className="text-emphasis text-xs font-medium leading-3">15 mins</span>
                      </div>
                    </div>
                    <p className="text-subtle text-sm font-medium leading-tight">Schedule a demo</p>
                  </div>
                  <button className="bg-default border-default flex items-center gap-1 rounded-[10px] border px-2 py-1">
                    <span className="text-emphasis text-sm font-medium">Book now</span>
                    <Icon name="arrow-right" className="text-subtle h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Divider */}
                <div className="bg-subtle h-px" />

                {/* Quick meeting event */}
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <p className="text-emphasis text-sm font-semibold leading-4">Quick meeting</p>
                      <div className="bg-emphasis flex h-4 items-center gap-1 rounded-md px-1">
                        <Icon name="bell" className="text-emphasis h-3 w-3" />
                        <span className="text-emphasis text-xs font-medium leading-3">15 mins</span>
                      </div>
                    </div>
                    <p className="text-subtle text-sm font-medium leading-tight">A quick chat</p>
                  </div>
                  <button className="bg-default border-default flex items-center gap-1 rounded-[10px] border px-2 py-1">
                    <span className="text-emphasis text-sm font-medium">Book now</span>
                    <Icon name="arrow-right" className="text-subtle h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Divider */}
                <div className="bg-subtle h-px" />

                {/* Longer meeting event */}
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <p className="text-emphasis text-sm font-semibold leading-4">Longer meeting</p>
                      <div className="bg-emphasis flex h-4 items-center gap-1 rounded-md px-1">
                        <Icon name="clock" className="text-emphasis h-3 w-3" />
                        <span className="text-emphasis text-xs font-medium leading-3">30 mins</span>
                      </div>
                    </div>
                    <p className="text-subtle text-sm font-medium leading-tight">A longer chat</p>
                  </div>
                  <button className="bg-default border-default flex items-center gap-1 rounded-[10px] border px-2 py-1">
                    <span className="text-emphasis text-sm font-medium">Book now</span>
                    <Icon name="arrow-right" className="text-subtle h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Divider */}
                <div className="bg-subtle h-px" />

                {/* Generic event */}
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <p className="text-emphasis text-sm font-semibold leading-4">Section header</p>
                    <p className="text-subtle text-sm font-medium leading-tight">
                      Brief description about the section
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
