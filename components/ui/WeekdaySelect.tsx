import React, { useEffect, useState } from "react";

export const WeekdaySelect = (props) => {
  const [activeDays, setActiveDays] = useState(
    [...Array(7).keys()].map((v, i) => (props.defaultValue || []).includes(i))
  );

  const days = ["S", "M", "T", "W", "T", "F", "S"];

  useEffect(() => {
    props.onSelect(activeDays.map((v, idx) => (v ? idx : -1)).filter((v) => v !== -1));
  }, [activeDays]);

  const toggleDay = (e, idx: number) => {
    e.preventDefault();
    activeDays[idx] = !activeDays[idx];
    setActiveDays([].concat(activeDays));
  };

  return (
    <div className="weekdaySelect">
      <div className="inline-flex">
        {days.map((day, idx) =>
          activeDays[idx] ? (
            <button
              key={idx}
              onClick={(e) => toggleDay(e, idx)}
              className={`
              w-10 h-10
                      bg-black text-white focus:outline-none px-3 py-1 rounded 
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
              onClick={(e) => toggleDay(e, idx)}
              style={{ marginTop: "1px", marginBottom: "1px" }}
              className={`w-10 h-10 bg-gray-50 focus:outline-none px-3 py-1 rounded-none ${
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
