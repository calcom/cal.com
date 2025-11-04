"use client";

import { Icon } from "@calcom/ui/components/icon";

export const OnboardingBrowserView = () => {
  return (
    <div className="hidden h-full w-full lg:flex lg:items-start lg:justify-center">
      <div className="sticky top-8 w-full max-w-[640px]">
        {/* Browser container */}
        <div className="bg-default border-subtle flex flex-col overflow-hidden rounded-tl-2xl rounded-tr-2xl border border-b-0">
          {/* Browser header */}
          <div className="border-subtle flex items-center gap-3 border-b bg-white p-3">
            {/* Navigation buttons */}
            <div className="flex items-center gap-0.5 opacity-50">
              <button className="bg-default border-default flex h-8 w-8 items-center justify-center rounded-[10px] border shadow-sm">
                <Icon name="arrow-left" className="text-subtle h-4 w-4" />
              </button>
              <button className="bg-default border-default flex h-8 w-8 items-center justify-center rounded-[10px] border shadow-sm">
                <Icon name="arrow-right" className="text-subtle h-4 w-4" />
              </button>
              <button className="bg-default border-default flex h-8 w-8 items-center justify-center rounded-[10px] border shadow-sm">
                <Icon name="rotate-cw" className="text-subtle h-4 w-4" />
              </button>
            </div>

            {/* Address bar */}
            <div className="bg-muted flex h-8 flex-1 items-center gap-2 rounded-full px-3">
              <Icon name="lock" className="text-subtle h-3.5 w-3.5" />
              <span className="text-emphasis text-sm font-medium">cal.com/team/</span>
            </div>

            {/* User menu */}
            <div className="flex items-center gap-1">
              <div className="border-default h-[26px] w-[26px] rounded-full border" />
              <button className="bg-default border-default flex h-8 w-8 items-center justify-center rounded-[10px] border opacity-40 shadow-sm">
                <Icon name="more-vertical" className="text-subtle h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Browser content - Booking page preview */}
          <div className="bg-muted flex flex-col gap-3 p-11">
            {/* Action Card */}
            <div className="bg-default border-muted flex flex-col overflow-hidden rounded-xl border">
              {/* First item - Active state */}
              <div className="flex flex-col gap-4 p-4">
                {/* Avatar placeholder */}
                <div className="bg-muted border-muted flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border" />

                {/* Team info placeholder */}
                <div className="flex flex-col gap-2">
                  <p className="font-cal text-xl leading-6 opacity-40">Team name</p>
                  <p className="text-emphasis text-sm font-medium opacity-40">Bio</p>
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
