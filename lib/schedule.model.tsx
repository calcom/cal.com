import {Dayjs} from "dayjs";

export default interface Schedule {
  id: number | null;
  startDate: Dayjs;
  endDate: Dayjs;
}