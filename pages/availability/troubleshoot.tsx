import Loader from "@components/Loader";
import prisma from "@lib/prisma";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { GetServerSideProps } from "next";
import { getSession } from "@lib/auth";
import { useEffect, useState } from "react";
import Shell from "@components/Shell";

dayjs.extend(utc);

export default function Troubleshoot({ user }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedDate, setSelectedDate] = useState(dayjs());

  function convertMinsToHrsMins(mins) {
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
        setAvailability(availableIntervals);
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
      <Shell
        heading="Troubleshoot"
        subtitle="Understand why certain times are available and others are blocked.">
        <div className="bg-white max-w-md overflow-hidden shadow rounded-sm">
          <div className="px-4 py-5 sm:p-6">
            Here is an overview of your day on {selectedDate.format("D MMMM YYYY")}:
            <small className="block text-neutral-400">
              Tip: Hover over the bold times for a full timestamp
            </small>
            <div className="mt-4 space-y-4">
              <div className="bg-black overflow-hidden rounded-sm">
                <div className="px-4 sm:px-6 py-2 text-white">
                  Your day starts at {convertMinsToHrsMins(user.startTime)}
                </div>
              </div>
              {availability.map((slot) => (
                <div key={slot.start} className="bg-neutral-100 overflow-hidden rounded-sm">
                  <div className="px-4 py-5 sm:p-6 text-black">
                    Your calendar shows you as busy between{" "}
                    <span className="font-medium text-neutral-800" title={slot.start}>
                      {dayjs(slot.start).format("HH:mm")}
                    </span>{" "}
                    and{" "}
                    <span className="font-medium text-neutral-800" title={slot.end}>
                      {dayjs(slot.end).format("HH:mm")}
                    </span>{" "}
                    on {dayjs(slot.start).format("D MMMM YYYY")}
                  </div>
                </div>
              ))}
              {availability.length === 0 && <Loader />}
              <div className="bg-black overflow-hidden rounded-sm">
                <div className="px-4 sm:px-6 py-2 text-white">
                  Your day ends at {convertMinsToHrsMins(user.endTime)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  if (!session) {
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

  return {
    props: { user },
  };
};
