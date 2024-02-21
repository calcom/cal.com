import axios from "axios";
import axiosRetry from "axios-retry";

import { Bookings } from "./bookings";
import { HttpCaller } from "./lib/http-caller";
import { Slots } from "./slots";
import type { CalSdkConstructorOptions } from "./types";

/**
 * Helper class to interact with the Cal.com V2 API.
 */
export class CalSdk {
  public httpCaller: HttpCaller;

  slots: Slots;
  bookings: Bookings;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly options: CalSdkConstructorOptions = {
      baseUrl: "https://api.cal.com/v2",
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
