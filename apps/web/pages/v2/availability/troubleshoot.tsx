import { useEffect, useState } from "react";

import dayjs, { Dayjs } from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import Shell from "@calcom/ui/Shell";

import { QueryCell } from "@lib/QueryCell";

import Loader from "@components/Loader";

type User = inferQueryOutput<"viewer.me">;

const AvailabilityView = ({ user }: { user: User }) => {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<{ end: string; start: string; title?: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());

  function convertMinsToHrsMins(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hs = h < 10 ? "0" + h : h;
    const ms = m < 10 ? "0" + m : m;
    return `${hs}:${ms}`;
  }

  useEffect(() => {
    const fetchAvailability = (date: Dayjs) => {
      const dateFrom = date.startOf("day").utc().format();
      const dateTo = date.endOf("day").utc().format();
      setLoading(true);

      fetch(`/api/availability/${user.username}?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .then((res) => {
          return res.json();
        })
        .then((availableIntervals) => {
          setAvailability(availableIntervals.busy);
        })
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
          setLoading(false);
        });
    };
    fetchAvailability(selectedDate);
  }, [user.username, selectedDate]);

  return (
    <div className="max-w-xl overflow-hidden rounded-md bg-white shadow">
      <div className="px-4 py-5 sm:p-6">
        {t("overview_of_day")}{" "}
        <input
          type="date"
          className="inline h-8 border-none p-0"
          defaultValue={selectedDate.format("YYYY-MM-DD")}
          onChange={(e) => {
            if (e.target.value) setSelectedDate(dayjs(e.target.value));
          }}
        />
        <small className="block text-neutral-400">{t("hover_over_bold_times_tip")}</small>
        <div className="mt-4 space-y-4">
          <div className="bg-brand dark:bg-darkmodebrand overflow-hidden rounded-md">
            <div className="text-brandcontrast dark:text-darkmodebrandcontrast px-4 py-2 sm:px-6">
              {t("your_day_starts_at")} {convertMinsToHrsMins(user.startTime)}
            </div>
          </div>
          {loading ? (
            <Loader />
          ) : availability.length > 0 ? (
            availability.map((slot) => (
              <div key={slot.start} className="overflow-hidden rounded-md bg-neutral-100">
                <div className="px-4 py-5 text-black sm:p-6">
                  {t("calendar_shows_busy_between")}{" "}
                  <span className="font-medium text-neutral-800" title={slot.start}>
                    {dayjs(slot.start).format("HH:mm")}
                  </span>{" "}
                  {t("and")}{" "}
                  <span className="font-medium text-neutral-800" title={slot.end}>
                    {dayjs(slot.end).format("HH:mm")}
                  </span>{" "}
                  {t("on")} {dayjs(slot.start).format("D")}{" "}
                  {t(dayjs(slot.start).format("MMMM").toLowerCase())} {dayjs(slot.start).format("YYYY")}
                  {slot.title && ` - (${slot.title})`}
                </div>
              </div>
            ))
          ) : (
            <div className="overflow-hidden rounded-md bg-neutral-100">
              <div className="px-4 py-5 text-black sm:p-6">{t("calendar_no_busy_slots")}</div>
            </div>
          )}

          <div className="bg-brand dark:bg-darkmodebrand overflow-hidden rounded-md">
            <div className="text-brandcontrast dark:text-darkmodebrandcontrast px-4 py-2 sm:px-6">
              {t("your_day_ends_at")} {convertMinsToHrsMins(user.endTime)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Troubleshoot() {
  const query = trpc.useQuery(["viewer.me"]);
  const { t } = useLocale();
  return (
    <div>
      <Shell heading={t("troubleshoot")} subtitle={t("troubleshoot_description")}>
        <QueryCell query={query} success={({ data }) => <AvailabilityView user={data} />} />
      </Shell>
    </div>
  );
}
