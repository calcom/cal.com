import axios from "axios";
import axiosRetry from "axios-retry";

import { Bookings } from "./endpoints/bookings";
import { Slots } from "./endpoints/slots";
import { HttpCaller } from "./lib/http-caller";
import type { CalSdkConstructorOptions } from "./types";

/**
 * Helper class to interact with the Cal.com V2 API.
 */
export class CalSdk {
  public httpCaller: HttpCaller;

  slots: Slots;
  bookings: Bookings;

  constructor(
    protected readonly clientId: string,
    protected readonly clientSecret: string,
    protected readonly options: CalSdkConstructorOptions = {
      baseUrl: "https://api.cal.com/", // don't set api version here as endpoints may have version-neutral or specific values.
    }
  ) {
    this.httpCaller = new HttpCaller(this._createAxiosClientBase());

    this.slots = new Slots(this);
    this.bookings = new Bookings(this);
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
