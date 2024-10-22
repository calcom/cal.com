import type { CalSdk } from "../../cal";
import { Endpoints } from "../../lib/endpoints";
import type { BasicPlatformResponse } from "../../types";
import { EndpointHandler } from "../endpoint-handler";
import type {
  CreateScheduleArgs,
  FormattedSchedule,
  GetScheduleByIdArgs,
  Schedule,
  SupportedTimezone,
  UpdateScheduleArgs,
} from "./types";

export class Schedules extends EndpointHandler {
  constructor(private readonly sdk: CalSdk) {
    super("schedules", sdk);
  }

  async createSchedule(args: CreateScheduleArgs): Promise<Schedule> {
    this.assertAccessToken("createSchedule");

    const { data } = await this.sdk.httpCaller.post<BasicPlatformResponse<Schedule>>(
      Endpoints.CREATE_SCHEDULE,
      {
        body: args,
        config: this.withForAtomParam(args.forAtom ?? false),
      }
    );

    return data;
  }

  async getDefaultSchedule(forAtom?: boolean): Promise<Schedule | FormattedSchedule> {
    this.assertAccessToken("getDefaultSchedule");

    const { data } = await this.sdk.httpCaller.get<BasicPlatformResponse<Schedule | FormattedSchedule>>(
      Endpoints.GET_DEFAULT_SCHEDULE,
      {
        config: this.withForAtomParam(forAtom ?? false),
      }
    );

    return data;
  }

  async getSchedules(forAtom?: boolean): Promise<Schedule[] | FormattedSchedule[]> {
    this.assertAccessToken("getSchedules");

    const { data } = await this.sdk.httpCaller.get<BasicPlatformResponse<Schedule[] | FormattedSchedule[]>>(
      Endpoints.GET_ALL_SCHEDULES,
      {
        config: this.withForAtomParam(forAtom ?? false),
      }
    );

    return data;
  }

  async getScheduleById(args: GetScheduleByIdArgs): Promise<Schedule | FormattedSchedule> {
    this.assertAccessToken("getScheduleById");

    const { data } = await this.sdk.httpCaller.get<BasicPlatformResponse<Schedule | FormattedSchedule>>(
      Endpoints.GET_SCHEDULE_BY_ID,
      {
        urlParams: [args.id.toString()],
        config: this.withForAtomParam(args.forAtom ?? false),
      }
    );

    return data;
  }

  async getSupportedTimezones(): Promise<SupportedTimezone[]> {
    const { data } = await this.sdk.httpCaller.get<BasicPlatformResponse<SupportedTimezone[]>>(
      Endpoints.GET_SUPPORTED_TIMEZONES
    );

    return data;
  }

  async updateSchedule(scheduleId: number, args: UpdateScheduleArgs) {
    this.assertAccessToken("updateSchedule");

    const { data } = await this.sdk.httpCaller.patch<BasicPlatformResponse<Schedule>>(
      Endpoints.UPDATE_SCHEDULE_BY_ID,
      {
        urlParams: [scheduleId.toString()],
        body: args,
      }
    );

    return data;
  }
  async deleteSchedule(scheduleId: number): Promise<boolean> {
    this.assertAccessToken("deleteSchedule");

    const { status } = await this.sdk.httpCaller.delete<BasicPlatformResponse>(
      Endpoints.DELETE_SCHEDULE_BY_ID,
      {
        urlParams: [scheduleId.toString()],
      }
    );

    return status === "success";
  }
}
