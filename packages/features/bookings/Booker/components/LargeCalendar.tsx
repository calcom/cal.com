import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";

import { useBookerStore } from "../store";

export const LargeCalendar = () => {
  const [setSelectedDate, setSelectedTimeslot] = useBookerStore(
    (state) => [state.setSelectedDate, state.setSelectedTimeslot],
    shallow
  );

  return (
    <div className="bg-muted flex h-full w-full flex-col items-center justify-center">
      Something big is coming...
      <br />
      <button
        className="max-w-[300px] underline"
        type="button"
        onClick={(ev) => {
          ev.preventDefault();
          setSelectedDate(dayjs().format("YYYY-MM-DD"));
          setSelectedTimeslot(dayjs().format());
        }}>
        Click this button to set date + time in one go just like the big thing that is coming here would do.
        :)
      </button>
    </div>
  );
};
