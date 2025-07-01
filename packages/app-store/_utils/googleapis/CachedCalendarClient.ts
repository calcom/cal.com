import type { calendar_v3 } from "@googleapis/calendar";

import type { CacheConfig } from "./GoogleApiCache";
import type { CachedFetchManager } from "./cachedFetch";
import { cachedFetch } from "./cachedFetch";

export class CachedCalendarClient implements calendar_v3.Calendar {
  private client: calendar_v3.Calendar;
  private credentialId: number;
  private cacheManager?: CachedFetchManager;

  constructor(client: calendar_v3.Calendar, credentialId: number, cacheManager?: CachedFetchManager) {
    this.client = client;
    this.credentialId = credentialId;
    this.cacheManager = cacheManager;
  }

  get context(): calendar_v3.Calendar["context"] {
    return this.client.context;
  }

  get acl(): calendar_v3.Calendar["acl"] {
    return this.client.acl;
  }

  get calendars() {
    return this.client.calendars;
  }

  get channels() {
    return this.client.channels;
  }

  get colors() {
    return this.client.colors;
  }

  get events() {
    return this.client.events;
  }

  get freebusy() {
    return this.client.freebusy;
  }

  get settings() {
    return this.client.settings;
  }

  get calendarList() {
    return this.client.calendarList;
  }

  get originalClient(): calendar_v3.Calendar {
    return this.client;
  }

  async listEvents(params: calendar_v3.Params$Resource$Events$List) {
    return cachedFetch(
      this.credentialId,
      "events.list",
      params,
      () => this.client.events.list(params),
      this.cacheManager
    );
  }

  async getEvent(params: calendar_v3.Params$Resource$Events$Get) {
    return cachedFetch(
      this.credentialId,
      "events.get",
      params,
      () => this.client.events.get(params),
      this.cacheManager
    );
  }

  async getEventInstances(params: calendar_v3.Params$Resource$Events$Instances) {
    return cachedFetch(
      this.credentialId,
      "events.instances",
      params,
      () => this.client.events.instances(params),
      this.cacheManager
    );
  }

  async queryFreebusy(params: calendar_v3.Params$Resource$Freebusy$Query) {
    return cachedFetch(
      this.credentialId,
      "freebusy.query",
      params,
      () => this.client.freebusy.query(params),
      this.cacheManager
    );
  }

  async listCalendars(params: calendar_v3.Params$Resource$Calendarlist$List = {}) {
    return cachedFetch(
      this.credentialId,
      "calendarList.list",
      params,
      () => this.client.calendarList.list(params),
      this.cacheManager
    );
  }

  getCacheStats(): { size: number; credentialId: number; config: CacheConfig } | null {
    return this.cacheManager?.getCacheStats(this.credentialId) || null;
  }
}
