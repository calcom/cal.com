import { valueFormatter } from "../lib/valueFormatter";
import { BarChart } from "./BarChart";

export const TimeOfDayBarChart = () => {
  const minutesTimeLine = [
    {
      Month: "Sunday",
      Minutes: 10,
    },
    {
      Month: "Monday",
      Minutes: 25,
    },
    {
      Month: "Tuesday",
      Minutes: 2,
    },
    {
      Month: "Wednesday",
      Minutes: 8,
    },
    {
      Month: "Thursday",
      Minutes: 10,
    },
    {
      Month: "Friday",
      Minutes: 19,
    },
    {
      Month: "Saturday",
      Minutes: 5,
    },
  ];

  return (
    <>
      <BarChart
        className="linechart mt-4 h-80"
        data={minutesTimeLine ?? []}
        categories={["Minutes"]}
        index="Month"
        colors={["blue"]}
        valueFormatter={valueFormatter}
      />
    </>
  );
};
