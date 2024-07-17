import type { CalSdk } from "../../cal";
import { Endpoints } from "../../lib/endpoints";
import type { BasicPlatformResponse, PaginationOptions } from "../../types";
import { EndpointHandler } from "../endpoint-handler";
import type { CreateUserArgs, CreateUserResponse, User } from "./types";

export class ManagedUsers extends EndpointHandler {
  constructor(private readonly sdk: CalSdk) {
    super("users", sdk);
  }

  async getManagedUsers(pagination?: PaginationOptions): Promise<User> {
    this.assertClientSecret("getManagedUsers");

    const { data } = await this.sdk.httpCaller.get<BasicPlatformResponse<User>>(
      Endpoints.GET_MANAGED_USERS_BY_CLIENT_ID,
      {
        urlParams: [this.sdk.clientId],
        config: {
          params: pagination,
        },
      }
    );

    return data;
  }

  async createManagedUser(input: CreateUserArgs): Promise<CreateUserResponse> {
    this.assertClientSecret("createManagedUser");

    const { data } = await this.sdk.httpCaller.post<BasicPlatformResponse<CreateUserResponse>>(
      Endpoints.CREATE_MANAGED_USER,
      {
        urlParams: [this.sdk.clientId],
        body: input,
      }
    );

    return data;
  }

  async getManagedUser(userId: number): Promise<User> {
    this.assertClientSecret("getManagedUser");

    const { data } = await this.sdk.httpCaller.get<BasicPlatformResponse<User>>(
      Endpoints.GET_MANAGED_USER_BY_ID,
      {
        urlParams: [this.sdk.clientId, userId.toString()],
      }
    );

    return data;
  }
}
