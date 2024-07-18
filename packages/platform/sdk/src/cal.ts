import axios from "axios";
import axiosRetry from "axios-retry";

import { Bookings } from "./endpoints/bookings";
import { Events } from "./endpoints/events";
import { EventTypes } from "./endpoints/events/event-types";
import { ManagedUsers } from "./endpoints/managed-users";
import { OAuthFlow } from "./endpoints/oauth-flow";
import { Schedules } from "./endpoints/schedules";
import { Slots } from "./endpoints/slots";
import { SdkInitializationError } from "./lib/errors/sdk-initialization-error";
import { HttpCaller } from "./lib/http-caller";
import { SdkSecrets } from "./lib/sdk-secrets";
import type { CalSdkConstructorOptions, SdkAuthOptions } from "./types";

export class CalSdk {
  public httpCaller: HttpCaller;

  slots: Slots;
  bookings: Bookings;
  events: Events;
  oauth: OAuthFlow;
  eventTypes: EventTypes;
  schedules: Schedules;
  users: ManagedUsers;

  private readonly _secrets: SdkSecrets;

  constructor(
    public readonly clientId: string,
    protected readonly authOptions: SdkAuthOptions,
    protected readonly options: CalSdkConstructorOptions = {
      baseUrl: "https://api.cal.com/", // don't set api version here as endpoints may have version-neutral or specific values.
    }
  ) {
    if (!authOptions.accessToken && !authOptions.clientSecret) {
      throw new SdkInitializationError("Either 'accessToken' or 'clientSecret' are required in authOptions");
    }

    this.httpCaller = new HttpCaller(this.clientId, this._createAxiosClientBase());
    this._secrets = new SdkSecrets(
      authOptions.clientSecret ?? "",
      authOptions.accessToken ?? "",
      authOptions.refreshToken ?? "",
      this.httpCaller
    );

    // avoid cyclic referencing.
    this.httpCaller.secrets = this._secrets;

    this.slots = new Slots(this);
    this.bookings = new Bookings(this);
    this.events = new Events(this);
    this.oauth = new OAuthFlow(this);
    this.eventTypes = new EventTypes(this);
    this.schedules = new Schedules(this);
    this.users = new ManagedUsers(this);
  }

  private _createAxiosClientBase() {
    const axiosClient = axios.create({
      baseURL: this.options.baseUrl,
    });

    // implement retry logic with an exponential back-off delay
    axiosRetry(axiosClient, {
      retries: this.options.httpRetries?.maxAmount ?? 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: axiosRetry.isNetworkOrIdempotentRequestError,
    });

    return axiosClient;
  }

  public secrets() {
    return this._secrets;
  }
}
