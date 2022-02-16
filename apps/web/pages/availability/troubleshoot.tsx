import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useEffect, useState } from "react";

import { QueryCell } from "@lib/QueryCell";
import { useLocale } from "@lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@lib/trpc";

import Loader from "@components/Loader";
import Shell from "@components/Shell";

dayjs.extend(utc);

type User = inferQueryOutput<"viewer.me">;

const AvailabilityView = ({ user }: { user: User }) => {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<{ end: string; start: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());

  function convertMinsToHrsMins(mins: number) {
    let h = Math.floor(mins / 60);
    let m = mins % 60;
    h = h < 10 ? 0 + h : h;
    m = m < 10 ? 0 + m : m;
    return `${h}:${m}`;
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
  }, [selectedDate]);

  return (
    <div className="max-w-xl overflow-hidden rounded-sm bg-white shadow">
      <div className="px-4 py-5 sm:p-6">
        {t("overview_of_day")}{" "}
        <input
          type="date"
          className="inline h-8 border-none p-0"
          defaultValue={selectedDate.format("YYYY-MM-DD")}
          onChange={(e) => {
            setSelectedDate(dayjs(e.target.value));
          }}
        />
        <small className="block text-neutral-400">{t("hover_over_bold_times_tip")}</small>
        <div className="mt-4 space-y-4">
          <div className="bg-brand overflow-hidden rounded-sm">
            <div className="text-brandcontrast px-4 py-2 sm:px-6">
              {t("your_day_starts_at")} {convertMinsToHrsMins(user.startTime)}
            </div>
          </div>
          {loading ? (
            <Loader />
          ) : availability.length > 0 ? (
            availability.map((slot) => (
              <div key={slot.start} className="overflow-hidden rounded-sm bg-neutral-100">
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
                </div>
              </div>
            ))
          ) : (
            <div className="overflow-hidden rounded-sm bg-neutral-100">
              <div className="px-4 py-5 text-black sm:p-6">{t("calendar_no_busy_slots")}</div>
            </div>
          )}

          <div className="bg-brand overflow-hidden rounded-sm">
            <div className="text-brandcontrast px-4 py-2 sm:px-6">
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
