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
      "America/Argentina/Cordoba": "San Francisco",
      "America/El_Salvador": "San Francisco Gotera",
      "America/Los_Angeles": "San Francisco",
      "America/Santo_Domingo": "San Francisco de Macoris",
      "America/Sao_Paulo": "Sao Francisco do Sul",
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
