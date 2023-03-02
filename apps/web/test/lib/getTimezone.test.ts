import { expect, it } from "@jest/globals";

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

it("should return empty array for an empty string", () => {
  expect(filterByCities("", cityData)).toStrictEqual([]);
});

it("should filter cities for a valid city name", () => {
  expect(filterByCities("San Francisco", cityData)).toStrictEqual(cityData);
});

it("should return appropriate timezone(s) for a given city name array", () => {
  const expected = {
    "America/Sao_Paulo": "Sao Francisco do Sul",
    "America/Los_Angeles": "San Francisco",
  };

  expect(addCitiesToDropdown(cityData)).toStrictEqual(expected);
});

it("should render city name as option label if cityData is not empty", () => {
  const expected = "San Francisco GMT -8:00";
  expect(handleOptionLabel(option, cityData)).toStrictEqual(expected);
});

it("should return timezone as option label if cityData is empty", () => {
  const expected = "America/Los_Angeles GMT -8:00";
  expect(handleOptionLabel(option, [])).toStrictEqual(expected);
});
