import Link from "next/link";

import { QueryCell } from "@lib/QueryCell";
import { useLocale } from "@lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@lib/trpc";

import Shell from "@components/Shell";

export function AvailabilityList({ schedules }: inferQueryOutput<"viewer.availability.list">) {
  const { t } = useLocale();
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

export default function Availability() {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.availability.list"]);
  return (
    <div>
      <Shell heading={t("availability")} subtitle={t("configure_availability")}>
        <QueryCell query={query} success={({ data }) => <AvailabilityList {...data} />} />
      </Shell>
    </div>
  );
}
