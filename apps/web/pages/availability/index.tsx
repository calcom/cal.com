import { Schedule, Availability } from "@prisma/client";
import Link from "next/link";
import React from "react";

import { QueryCell } from "@lib/QueryCell";
import { nameOfDay } from "@lib/core/i18n/weekday";
import { useLocale } from "@lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@lib/trpc";

import Shell from "@components/Shell";
import Button from "@components/ui/Button";

function scheduleAsString(schedule: Schedule, locale: string) {
  const weekSpan = (availability: Availability) => {
    const days = availability.days.slice(1).reduce(
      (days, day) => {
        if (days[days.length - 1].length === 1 && days[days.length - 1][0] === day - 1) {
          // append if the range is not complete (but the next day needs adding)
          days[days.length - 1].push(day);
        } else if (days[days.length - 1][days[days.length - 1].length - 1] === day - 1) {
          // range complete, overwrite if the last day directly preceeds the current day
          days[days.length - 1] = [days[days.length - 1][0], day];
        } else {
          // new range
          days.push([day]);
        }
        return days;
      },
      [[availability.days[0]]] as number[][]
    );
    return days
      .map((dayRange) => dayRange.map((day) => nameOfDay(locale, day, "short")).join(" - "))
      .join(", ");
  };

  const timeSpan = (availability: Availability) => {
    return (
      new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "numeric" }).format(availability.startTime) +
      " - " +
      new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "numeric" }).format(availability.endTime)
    );
  };

  return (
    <>
      {schedule.availability.map((availability: Availability) => (
        <>
          {weekSpan(availability)}, {timeSpan(availability)}
          <br />
        </>
      ))}
    </>
  );
}

export function AvailabilityList({ schedules }: inferQueryOutput<"viewer.availability.list">) {
  const { t, i18n } = useLocale();
  return (
    <div className="-mx-4 mb-16 overflow-hidden rounded-sm border border-gray-200 bg-white sm:mx-0">
      <ul className="divide-y divide-neutral-200" data-testid="schedules">
        {schedules.map((schedule) => (
          <li key={schedule.id}>
            <div className="flex items-center justify-between hover:bg-neutral-50">
              <div className="group flex w-full items-center justify-between px-4 py-4 hover:bg-neutral-50 sm:px-6">
                <Link href={"/availability/" + schedule.id}>
                  <a className="flex-grow truncate text-sm" title={schedule.name}>
                    <div>
                      <span className="truncate font-medium text-neutral-900">{schedule.name}</span>
                      {schedule.isDefault && (
                        <span className="ml-2 inline items-center rounded-sm bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800">
                          {t("default")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      {scheduleAsString(schedule, i18n.language)}
                    </p>
                  </a>
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AvailabilityPage() {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.availability.list"]);
  return (
    <div>
      <Shell
        heading={t("availability")}
        subtitle={t("configure_availability")}
        CTA={
          <Link href="/availability/9">
            <Button>New schedule</Button>
          </Link>
        }>
        <QueryCell query={query} success={({ data }) => <AvailabilityList {...data} />} />
      </Shell>
    </div>
  );
}
