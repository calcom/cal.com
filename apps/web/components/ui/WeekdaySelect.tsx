import React, { useEffect, useState } from "react";

interface WeekdaySelectProps {
  defaultValue: number[];
  onSelect: (selected: number[]) => void;
}

export const WeekdaySelect = (props: WeekdaySelectProps) => {
  const [activeDays, setActiveDays] = useState<boolean[]>(
    Array.from(Array(7).keys()).map((v, i) => (props.defaultValue || []).includes(i))
  );

  const days = ["S", "M", "T", "W", "T", "F", "S"];

  useEffect(() => {
    props.onSelect(activeDays.map((v, idx) => (v ? idx : -1)).filter((v) => v !== -1));
  }, [activeDays]);

  const toggleDay = (idx: number) => {
    activeDays[idx] = !activeDays[idx];
    setActiveDays(([] as boolean[]).concat(activeDays));
  };

  return (
    <div className="weekdaySelect">
      <div className="inline-flex">
        {days.map((day, idx) =>
          activeDays[idx] ? (
            <button
              key={idx}
              onClick={(e) => {
                e.preventDefault();
                toggleDay(idx);
              }}
              className={`
              bg-brand text-brandcontrast
                      h-10 w-10 rounded px-3 py-1 focus:outline-none 
                    ${activeDays[idx + 1] ? "rounded-r-none" : ""} 
                    ${activeDays[idx - 1] ? "rounded-l-none" : ""} 
                    ${idx === 0 ? "rounded-l" : ""} 
                    ${idx === days.length - 1 ? "rounded-r" : ""}
                  `}>
              {day}
            </button>
          ) : (
            <button
              key={idx}
              onClick={(e) => {
                e.preventDefault();
                toggleDay(idx);
              }}
              style={{ marginTop: "1px", marginBottom: "1px" }}
              className={`h-10 w-10 rounded-none bg-gray-50 px-3 py-1 focus:outline-none ${
                idx === 0 ? "rounded-l" : "border-l-0"
              } ${idx === days.length - 1 ? "rounded-r" : ""}`}>
              {day}
            </button>
          )
        )}
      </div>
    </div>
  );
};
