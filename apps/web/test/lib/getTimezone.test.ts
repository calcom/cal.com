import { expect, beforeEach, afterEach, it, vi, describe } from "vitest";

import { filterByCities, addCitiesToDropdown, handleOptionLabel } from "@calcom/lib/timezone";

const cityData = [
  {
    city: "San Francisco",
    timezone: "America/Argentina/Cordoba",
  },
  {
    city: "Sao Francisco do Sul",
    timezone: "America/Sao_Paulo",
  },
  {
    city: "San Francisco de Macoris",
    timezone: "America/Santo_Domingo",
  },
  {
    city: "San Francisco Gotera",
    timezone: "America/El_Salvador",
  },
  {
    city: "San Francisco",
    timezone: "America/Los_Angeles",
  },
  {
    city: "America/New_York",
    timezone: "Eastern Time - US & Canada",
  },
  {
    city: "America/Los_Angeles",
    timezone: "Pacific Time - US & Canada",
  },
  {
    city: "America/Chicago",
    timezone: "Central Time - US & Canada",
  },
  {
    city: "America/Denver",
    timezone: "Mountain Time - US & Canada",
  },
  {
    city: "America/Halifax",
    timezone: "Atlantic Time - Canada",
  },
  {
    city: "Europe/Bucharest",
    timezone: "Eastern European Time",
  },
  {
    city: "Europe/Berlin",
    timezone: "Central European Time",
  },
  {
    city: "Europe/London",
    timezone: "Western European Time",
  },
  {
    city: "Australia/Sydney",
    timezone: "Australian Eastern Time",
  },
  {
    city: "Asia/Tokyo",
    timezone: "Japan Standard Time",
  },
  {
    city: "Asia/Kolkata",
    timezone: "India Standard Time",
  },
  {
    city: "Asia/Dubai",
    timezone: "Gulf Standard Time",
  },
  {
    city: "Africa/Johannesburg",
    timezone: "South Africa Standard Time",
  },
  {
    city: "America/Sao_Paulo",
    timezone: "Brazil Time",
  },
  {
    city: "Pacific/Honolulu",
    timezone: "Hawaii-Aleutian Standard Time",
  },
];

const option = {
  value: "America/Los_Angeles",
  label: "(GMT-8:00) San Francisco",
  offset: -8,
  abbrev: "PST",
  altName: "Pacific Standard Time",
};

describe("getTimezone", () => {
  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date("2020-01-01"));
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("should return empty array for an empty string", () => {
    expect(filterByCities("", cityData)).toMatchInlineSnapshot(`[]`);
  });

  it("should filter cities for a valid city name", () => {
    expect(filterByCities("San Francisco", cityData)).toMatchInlineSnapshot(`
      [
        {
          "city": "San Francisco",
          "timezone": "America/Argentina/Cordoba",
        },
        {
          "city": "San Francisco de Macoris",
          "timezone": "America/Santo_Domingo",
        },
        {
          "city": "San Francisco Gotera",
          "timezone": "America/El_Salvador",
        },
        {
          "city": "San Francisco",
          "timezone": "America/Los_Angeles",
        },
      ]
    `);
  });

  it("should return appropriate timezone(s) for a given city name array", () => {
    expect(addCitiesToDropdown(cityData)).toMatchInlineSnapshot(`
      {
        "Africa/Johannesburg": "South Africa Standard Time",
        "America/Argentina/Cordoba": "San Francisco",
        "America/Chicago": "Central Time - US & Canada",
        "America/Denver": "Mountain Time - US & Canada",
        "America/El_Salvador": "San Francisco Gotera",
        "America/Halifax": "Atlantic Time - Canada",
        "America/Los_Angeles": "Pacific Time - US & Canada",
        "America/New_York": "Eastern Time - US & Canada",
        "America/Santo_Domingo": "San Francisco de Macoris",
        "America/Sao_Paulo": "Brazil Time",
        "Asia/Dubai": "Gulf Standard Time",
        "Asia/Kolkata": "India Standard Time",
        "Asia/Tokyo": "Japan Standard Time",
        "Atlantic Time - Canada": "America/Halifax",
        "Australia/Sydney": "Australian Eastern Time",
        "Australian Eastern Time": "Australia/Sydney",
        "Brazil Time": "America/Sao_Paulo",
        "Central European Time": "Europe/Berlin",
        "Central Time - US & Canada": "America/Chicago",
        "Eastern European Time": "Europe/Bucharest",
        "Eastern Time - US & Canada": "America/New_York",
        "Europe/Berlin": "Central European Time",
        "Europe/Bucharest": "Eastern European Time",
        "Europe/London": "Western European Time",
        "Gulf Standard Time": "Asia/Dubai",
        "Hawaii-Aleutian Standard Time": "Pacific/Honolulu",
        "India Standard Time": "Asia/Kolkata",
        "Japan Standard Time": "Asia/Tokyo",
        "Mountain Time - US & Canada": "America/Denver",
        "Pacific Time - US & Canada": "America/Los_Angeles",
        "Pacific/Honolulu": "Hawaii-Aleutian Standard Time",
        "South Africa Standard Time": "Africa/Johannesburg",
        "Western European Time": "Europe/London",
      }
    `);
  });

  it("should render city name as option label if cityData is not empty", () => {
    expect(handleOptionLabel(option, cityData)).toMatchInlineSnapshot(`"San Francisco GMT -8:00"`);
    vi.setSystemTime(new Date("2020-06-01"));
    expect(handleOptionLabel(option, cityData)).toMatchInlineSnapshot(`"San Francisco GMT -7:00"`);
  });

  it("should return timezone as option label if cityData is empty", () => {
    expect(handleOptionLabel(option, [])).toMatchInlineSnapshot(`"America/Los Angeles GMT -8:00"`);
    vi.setSystemTime(new Date("2020-06-01"));
    expect(handleOptionLabel(option, [])).toMatchInlineSnapshot(`"America/Los Angeles GMT -7:00"`);
  });
});
