import { useContext } from "react";
import { useStore } from "zustand";

import { TBContext } from "../store";

export function TimeDial() {
  const store = useContext(TBContext);
  if (!store) throw new Error("Missing BearContext.Provider in the tree");
  const tzs = useStore(store, (s) => s.timezones);
  const timezones = Array.from(tzs.values());

  return (
    <div className="flex flex-col space-y-3 divide-y-2">
      {timezones.map((tz) => {
        const { name, offset, abbr } = tz;
        return (
          <div key={name}>
            <p>{name}</p>
            <p>{offset}</p>
            <p>{abbr}</p>
          </div>
        );
      })}
    </div>
  );
}
