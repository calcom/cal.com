import type { CalSdk } from "../../cal";
import { Endpoints } from "../../lib/endpoints";
import type { BasicPlatformResponse } from "../../types";
import { EndpointHandler } from "../endpoint-handler";
import type { CreateScheduleArgs, FormattedSchedule, Schedule } from "./types";

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
        ...(args.forAtom && {
          config: this.withForAtom(),
        }),
      }
    );

    return data;
  }

  async getDefaultSchedule(forAtom?: boolean): Promise<Schedule | FormattedSchedule> {
    this.assertAccessToken("getDefaultSchedule");

    const { data } = await this.sdk.httpCaller.get<BasicPlatformResponse<Schedule | FormattedSchedule>>(
      Endpoints.GET_DEFAULT_SCHEDULE,
      {
        ...(forAtom && {
          config: this.withForAtom(),
        }),
      }
    );

    return data;
  }
}
