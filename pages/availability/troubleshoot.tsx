import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useEffect, useState } from "react";

import { getSession } from "@lib/auth";
import { getOrSetUserLocaleFromHeaders } from "@lib/core/i18n/i18n.utils";
import { useLocale } from "@lib/hooks/useLocale";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import Loader from "@components/Loader";
import Shell from "@components/Shell";

dayjs.extend(utc);

export default function Troubleshoot({ user }: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());

  function convertMinsToHrsMins(mins: number) {
    let h = Math.floor(mins / 60);
    let m = mins % 60;
    h = h < 10 ? "0" + h : h;
    m = m < 10 ? "0" + m : m;
    return `${h}:${m}`;
  }

  const fetchAvailability = (date) => {
    const dateFrom = date.startOf("day").utc().format();
    const dateTo = date.endOf("day").utc().format();

    fetch(`/api/availability/${user.username}?dateFrom=${dateFrom}&dateTo=${dateTo}`)
      .then((res) => {
        return res.json();
      })
      .then((availableIntervals) => {
        setAvailability(availableIntervals.busy);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
      });
  };

  useEffect(() => {
    fetchAvailability(selectedDate);
  }, [selectedDate]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <Shell heading={t("troubleshoot")} subtitle={t("troubleshoot_description")}>
        <div className="bg-white max-w-xl overflow-hidden shadow rounded-sm">
          <div className="px-4 py-5 sm:p-6">
            {t("overview_of_day")}{" "}
            <input
              type="date"
              className="inline border-none h-8 p-0"
              defaultValue={selectedDate.format("YYYY-MM-DD")}
              onBlur={(e) => {
                setSelectedDate(dayjs(e.target.value));
              }}
            />
            <small className="block text-neutral-400">{t("hover_over_bold_times_tip")}</small>
            <div className="mt-4 space-y-4">
              <div className="bg-black overflow-hidden rounded-sm">
                <div className="px-4 sm:px-6 py-2 text-white">
                  {t("your_day_starts_at")} {convertMinsToHrsMins(user.startTime)}
                </div>
              </div>
              {availability.map((slot) => (
                <div key={slot.start} className="bg-neutral-100 overflow-hidden rounded-sm">
                  <div className="px-4 py-5 sm:p-6 text-black">
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
              ))}
              {availability.length === 0 && <Loader />}
              <div className="bg-black overflow-hidden rounded-sm">
                <div className="px-4 sm:px-6 py-2 text-white">
                  {t("your_day_ends_at")} {convertMinsToHrsMins(user.endTime)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    </div>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getSession(context);
  const locale = await getOrSetUserLocaleFromHeaders(context.req);

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
    },
    select: {
      startTime: true,
      endTime: true,
      username: true,
    },
  });

  if (!user) return { redirect: { permanent: false, destination: "/auth/login" } };

  return {
    props: {
      session,
      user,
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
};
