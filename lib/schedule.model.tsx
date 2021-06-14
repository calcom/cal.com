import {Dayjs} from "dayjs";

export default interface Schedule {
  key: number;
  startDate: Dayjs;
  endDate: Dayjs;
}