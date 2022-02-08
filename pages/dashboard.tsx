import dayjs from "dayjs";
import React from "react";

import Shell, { useMeQuery } from "@components/Shell";
import Button from "@components/ui/Button";

export default function Dashboard() {
  const query = useMeQuery();
  const user = query.data;
  return (
    <>
      <Shell heading="Dashboard" headless>
        <div className="flex">
          <div className="w-3/4 mr-8">
            <img src="https://tailwindui.com/img/components/calendars.03-week-view-xl.png" alt="Calendar" />
          </div>
          <div className="w-1/4">
            <div className="mb-4">
              <h1 className="text-2xl font-cal text-gray-900">
                Good {(dayjs().hour() < 12 && "morning") || (dayjs().hour() < 18 && "afternoon") || "evening"}
                , {user?.name ? user?.name.split(" ")[0] : user?.username}!
              </h1>
              <p className="text-gray-500">You have 5 new meetings for you to approve.</p>
            </div>
            <div className="mb-8">
              <Button className="w-full mb-4">New event type</Button>
              <Button className="w-full" color="secondary">
                Change your availability
              </Button>
            </div>
            <div>
              <h2 className="text-xl font-cal text-gray-800 mb-4">Pending approval</h2>
              <div className="bg-white border px-5 py-3 mb-2">
                30min with Peer
                <br />
                peer@cal.com
                <br />
                Additional notes
              </div>
              <div className="bg-white border px-5 py-3">Another booking here</div>
            </div>
          </div>
        </div>
      </Shell>
    </>
  );
}
