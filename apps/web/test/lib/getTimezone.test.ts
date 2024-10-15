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
    timezone: "America/New_York",
    city: "Eastern Time - US & Canada",
  },
  {
    timezone: "America/Los_Angeles",
    city: "Pacific Time - US & Canada",
  },
  {
    timezone: "America/Chicago",
    city: "Central Time - US & Canada",
  },
  {
    timezone: "America/Denver",
    city: "Mountain Time - US & Canada",
  },
  {
    timezone: "America/Halifax",
    city: "Atlantic Time - Canada",
  },
  {
    timezone: "Europe/Bucharest",
    city: "Eastern European Time",
  },
  {
    timezone: "Europe/Berlin",
    city: "Central European Time",
  },
  {
    timezone: "Europe/London",
    city: "Western European Time",
  },
  {
    timezone: "Australia/Sydney",
    city: "Australian Eastern Time",
  },
  {
    timezone: "Asia/Tokyo",
    city: "Japan Standard Time",
  },
  {
    timezone: "Asia/Kolkata",
    city: "India Standard Time",
  },
  {
    timezone: "Asia/Dubai",
    city: "Gulf Standard Time",
  },
  {
    timezone: "Africa/Johannesburg",
    city: "South Africa Standard Time",
  },
  {
    timezone: "America/Sao_Paulo",
    city: "Brazil Time",
  },
  {
    timezone: "Pacific/Honolulu",
    city: "Hawaii-Aleutian Standard Time",
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
        "Australia/Sydney": "Australian Eastern Time",
        "Europe/Berlin": "Central European Time",
        "Europe/Bucharest": "Eastern European Time",
        "Europe/London": "Western European Time",
        "Mountain Time - US & Canada": "America/Denver",
        "Pacific Time - US & Canada": "America/Los_Angeles",
        "Pacific/Honolulu": "Hawaii-Aleutian Standard Time",
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
