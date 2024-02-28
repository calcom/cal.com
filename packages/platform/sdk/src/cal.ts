import axios from "axios";
import axiosRetry from "axios-retry";

import { Bookings } from "./endpoints/bookings";
import { Events } from "./endpoints/events";
import { Slots } from "./endpoints/slots";
import { SdkInitializationError } from "./lib/errors/sdk-initialization-error";
import { HttpCaller } from "./lib/http-caller";
import type { CalSdkConstructorOptions, SdkAuthOptions } from "./types";

/**
 * Helper class to interact with the Cal.com V2 API.
 */
export class CalSdk {
  public httpCaller: HttpCaller;

  slots: Slots;
  bookings: Bookings;
  events: Events;

  constructor(
    protected readonly clientId: string,
    protected readonly authOptions: SdkAuthOptions,
    protected readonly options: CalSdkConstructorOptions = {
      baseUrl: "https://api.cal.com/", // don't set api version here as endpoints may have version-neutral or specific values.
    }
  ) {
    if (!authOptions.accessToken && !authOptions.clientSecret) {
      throw new SdkInitializationError("Either 'accessToken' or 'clientSecret' are required in authOptions");
    }

    this.httpCaller = new HttpCaller(this.clientId, this._createAxiosClientBase(), this.authOptions);

    this.slots = new Slots(this);
    this.bookings = new Bookings(this);
    this.events = new Events(this);
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
}
