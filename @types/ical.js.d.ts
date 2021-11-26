// SPDX-FileCopyrightText: © 2019 EteSync Authors
// SPDX-License-Identifier: GPL-3.0-only

declare module "ical.js" {
    function parse(input: string): any[];
  
    export class helpers {
      static public updateTimezones(vcal: Component): Component;
    }
  
    class Component {
      static public fromString(str: string): Component;
  
      public name: string;
  
      constructor(jCal: any[] | string, parent?: Component);
  
      public toJSON(): any[];
  
      public getFirstSubcomponent(name?: string): Component | null;
      public getAllSubcomponents(name?: string): Component[];
  
      public getFirstPropertyValue<T = any>(name?: string): T;
  
      public getFirstProperty(name?: string): Property;
      public getAllProperties(name?: string): Property[];
  
      public addProperty(property: Property): Property;
      public addPropertyWithValue(name: string, value: string | number | Record<string, unknown>): Property;
      
      public hasProperty(name?: string): boolean;
  
      public updatePropertyWithValue(name: string, value: string | number | Record<string, unknown>): Property;
  
      public removeAllProperties(name?: string): boolean;
  
      public addSubcomponent(component: Component): Component;
    }
  
    export class Event {
      public uid: string;
      public summary: string;
      public startDate: Time;
      public endDate: Time;
      public description: string;
      public location: string;
      public attendees: Property[];
  
      public component: Component;
  
      public constructor(component?: Component | null, options?: {strictExceptions: boolean, exepctions: Array<Component | Event>});
  
      public isRecurring(): boolean;
      public iterator(startTime?: Time): RecurExpansion;
    }
  
    export class Property {
      public name: string;
      public type: string;
  
      constructor(jCal: any[] | string, parent?: Component);
  
      public getFirstValue<T = any>(): T;
      public getValues<T = any>(): T[];
  
      public setParameter(name: string, value: string | string[]): void;
      public setValue(value: string | Record<string, unknown>): void;
      public setValues(values: (string | Record<string, unknown>)[]): void;
      public toJSON(): any;
    }
  
    interface TimeJsonData {
      year?: number;
      month?: number;
      day?: number;
      hour?: number;
      minute?: number;
      second?: number;
      isDate?: boolean;
    }
  
    export class Time {
      static public fromString(str: string): Time;
      static public fromJSDate(aDate: Date | null, useUTC: boolean): Time;
      static public fromData(aData: TimeJsonData): Time;
  
      static public now(): Time;
  
      public isDate: boolean;
      public timezone: string;
      public zone: Timezone;
  
      public year: number;
      public month: number;
      public day: number;
      public hour: number;
      public minute: number;
      public second: number;
  
      constructor(data?: TimeJsonData);
      public compare(aOther: Time): number;
  
      public clone(): Time;
      public convertToZone(zone: Timezone): Time;
  
      public adjust(
        aExtraDays: number, aExtraHours: number, aExtraMinutes: number, aExtraSeconds: number, aTimeopt?: Time): void;
  
      public addDuration(aDuration: Duration): void;
      public subtractDateTz(aDate: Time): Duration;
  
      public toUnixTime(): number;
      public toJSDate(): Date;
      public toJSON(): TimeJsonData;
      public get icaltype(): "date" | "date-time"; 
    }
  
    export class Duration {
      public days: number;
    }
  
    export class RecurExpansion {
      public complete: boolean;
      public dtstart: Time;
      public last: Time;
      public next(): Time;
      public fromData(options);
      public toJSON();
      constructor(options: {
        /** Start time of the event */
        dtstart: Time;
        /** Component for expansion, required if not resuming. */
        component?: Component;
      })
    }
  
    export class Timezone {
      static public utcTimezone: Timezone;
      static public localTimezone: Timezone;
      static public convert_time(tt: Time, fromZone: Timezone, toZone: Timezone): Time;
  
  
      public tzid: string;
      public component: Component;
  
      constructor(data: Component | {
        component: string | Component;
        tzid?: string;
        location?: string;
        tznames?: string;
        latitude?: number;
        longitude?: number;
      });
    }
  
    export class TimezoneService {
      static public get(tzid: string): Timezone | null;
      static public has(tzid: string): boolean;
      static public register(tzid: string, zone: Timezone | Component);
      static public remove(tzid: string): Timezone | null;
    }
  
    export type FrequencyValues = "YEARLY" | "MONTHLY" | "WEEKLY" | "DAILY" | "HOURLY" | "MINUTELY" | "SECONDLY";
  
    export enum WeekDay {
      SU = 1,
      MO,
      TU,
      WE,
      TH,
      FR,
      SA,
    }
  
    export class RecurData {
      public freq?: FrequencyValues;
      public interval?: number;
      public wkst?: WeekDay;
      public until?: Time;
      public count?: number;
      public bysecond?: number[] | number;
      public byminute?: number[] | number;
      public byhour?: number[] | number;
      public byday?: string[] | string;
      public bymonthday?: number[] | number;
      public byyearday?: number[] | number;
      public byweekno?: number[] | number;
      public bymonth?: number[] | number;
      public bysetpos?: number[] | number;
    }
  
    export class RecurIterator {
      public next(): Time;
    }
  
    export class Recur {
      constructor(data?: RecurData);
      public until: Time | null;
      public freq: FrequencyValues;
      public count: number | null;
  
      public clone(): Recur;
      public toJSON(): Omit<RecurData, "until"> & { until?: string };
      public iterator(startTime?: Time): RecurIterator;
      public isByCount(): boolean;
    }
  }
