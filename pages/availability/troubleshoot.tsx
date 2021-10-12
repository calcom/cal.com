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

export default function Troubleshoot({ user, localeProp }: inferSSRProps<typeof getServerSideProps>) {
  const { t, locale } = useLocale({ localeProp });
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
      <Shell heading={t("troubleshoot")} subtitle={t("troubleshoot_subtitle")}>
        <div className="max-w-xl overflow-hidden bg-white rounded-sm shadow">
          <div className="px-4 py-5 sm:p-6">
            {t("here_overview_your_day")}{" "}
            <input
              type="date"
              className="inline h-8 p-0 border-none"
              defaultValue={selectedDate.format("YYYY-MM-DD")}
              onBlur={(e) => {
                setSelectedDate(dayjs(e.target.value));
              }}
            />
            <small className="block text-neutral-400">{t("tip_hover_full_timestamp")}</small>
            <div className="mt-4 space-y-4">
              <div className="overflow-hidden bg-black rounded-sm">
                <div className="px-4 py-2 text-white sm:px-6">
                  {t("your_day_starts")} {convertMinsToHrsMins(user.startTime)}
                </div>
              </div>
              {availability.map((slot) => (
                <div key={slot.start} className="overflow-hidden rounded-sm bg-neutral-100">
                  <div className="px-4 py-5 text-black sm:p-6">
                    {t("your_calendar_busy")}{" "}
                    <span className="font-medium text-neutral-800" title={slot.start}>
                      {dayjs(slot.start).format("HH:mm")}
                    </span>{" "}
                    {t("and")}{" "}
                    <span className="font-medium text-neutral-800" title={slot.end}>
                      {dayjs(slot.end).format("HH:mm")}
                    </span>{" "}
                    {t("on")} {dayjs(slot.start).format("D MMMM YYYY")}
                  </div>
                </div>
              ))}
              {availability.length === 0 && <Loader />}
              <div className="overflow-hidden bg-black rounded-sm">
                <div className="px-4 py-2 text-white sm:px-6">
                  {t("your_day_ends")} {convertMinsToHrsMins(user.endTime)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const locale = await getOrSetUserLocaleFromHeaders(context.req);
  const session = await getSession(context);
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
      localeProp: locale,
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
