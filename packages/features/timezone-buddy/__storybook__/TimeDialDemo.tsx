import { useState } from "react";

import dayjs from "@calcom/dayjs";

import { TimeDial } from "../components/TimeDial";
import { TBContext, createTimezoneBuddyStore } from "../store";

const WorkingHours = [
  {
    days: [0, 1, 2],
    startTime: dayjs().set("hour", 9).set("minute", 0).toDate(),
    endTime: dayjs().set("hour", 18).set("minute", 0).toDate(),
  },
  {
    days: [4],
    startTime: dayjs().set("hour", 3).set("minute", 0).toDate(),
    endTime: dayjs().set("hour", 5).set("minute", 0).toDate(),
  },
  {
    days: [4],
    startTime: dayjs().set("hour", 15).set("minute", 0).toDate(),
    endTime: dayjs().set("hour", 18).set("minute", 0).toDate(),
  },
];
const WorkingHoursTwo = [
  {
    days: [1, 2, 3, 4],
    startTime: dayjs().set("hour", 9).set("minute", 0).toDate(),
    endTime: dayjs().set("hour", 17).set("minute", 0).toDate(),
  },
];

export function TimeDialDemo() {
  const [browsingDate, setBrowsingDate] = useState(new Date());
  return (
    <div className="">
      <div className="flex justify-center">
        <button
          onClick={() => {
            setBrowsingDate((prev) => {
              const newDate = new Date(prev);
              newDate.setDate(newDate.getDate() - 1);
              return newDate;
            });
          }}>
          <span>- 1 day</span>
        </button>
        <button
          onClick={() => {
            setBrowsingDate((prev) => {
              const newDate = new Date(prev);
              newDate.setDate(newDate.getDate() + 1);
              return newDate;
            });
          }}>
          <span>+ 1 day</span>
        </button>
      </div>
      <div className="mb-4 flex">
        Current Browsing Date: {dayjs(browsingDate).format("dddd MMMM DD YYYY")}
      </div>
      <TBContext.Provider
        value={createTimezoneBuddyStore({
          browsingDate,
          uniquedTimezones: [
            "America/New_York",
            "America/Los_Angeles",
            "Europe/London",
            "Asia/Tokyo",
            "Africa/Cairo",
            "Australia/Sydney",
            "Australia/Sydney",
            "Australia/Sydney",
            "Australia/Sydney",
            "Pacific/Auckland",
            "Asia/Dubai",
            "Europe/Paris",
            "America/Chicago",
            "Asia/Shanghai",
          ],
        })}>
        <div className="flex flex-col space-y-2">
          London
          <span>Sunday Monday Tuesday 9am-6pm</span>
          <span>Thursday 2am-5am and 3pm-6pm</span>
          <TimeDial timezone="Europe/London" dateRanges={WorkingHours} />
        </div>
        <div className="flex flex-col space-y-2">
          User Two (Asia/Tokyo): Sunday 2am - 9am
          <span>Sunday Monday Tuesday 9am-6pm</span>
          <span>Thursday 2am-5am and 3pm-6pm</span>
          <TimeDial timezone="Asia/Tokyo" dateRanges={WorkingHours} />
        </div>
        <div className="flex flex-col space-y-2">
          User Three (Asia/Dubai): mon-friday 9am-5pm
          <TimeDial timezone="Asia/Dubai" dateRanges={WorkingHoursTwo} />
        </div>
      </TBContext.Provider>
    </div>
  );
}
