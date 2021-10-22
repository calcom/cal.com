import { ConfigType } from "dayjs";

export type TimeRange = {
  start: ConfigType;
  end: ConfigType;
};

export type Schedule = TimeRange[][];
