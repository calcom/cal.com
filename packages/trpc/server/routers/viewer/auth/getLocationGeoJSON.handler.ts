import type { ICountry } from "country-state-city";
import { Country } from "country-state-city";
import { geoMercator } from "d3";

import type { TGetLocationGeoJSONSchema } from "./getLocationGeoJSON.schema";
import { worldviewGeoJSON } from "./worldView";

type getLocationGeoJSON = {
  input: TGetLocationGeoJSONSchema;
};

export const getHandler = async ({ input }: getLocationGeoJSON) => {
  const { timeZone } = input;

  // Search country by timezone
  const targetCountry: ICountry | undefined = Country.getAllCountries().find((c: any) => {
    const alltimezones = c.timezones.map((t: any) => {
      return t.zoneName;
    });

    if (alltimezones.includes(timeZone)) return true;

    return false;
  });

  if (!targetCountry) return;

  // Find country's geo json data
  const country = worldviewGeoJSON.features.find((feature: any) => {
    return feature.properties.name_en === targetCountry.name;
  });
  const areaCoordinates: ([number, number] | null)[] = [];
  country?.geometry.coordinates.map((g: any) => {
    areaCoordinates.push(...(g as [number, number][]));
  });

  // Convert geo json data to svg coordinates
  let svgCoordinates: ([number, number] | null | undefined)[] = [];

  if (areaCoordinates) {
    const projection = geoMercator().scale(100).translate([318, 235]);

    svgCoordinates = areaCoordinates
      .filter((coord) => coord !== null)
      .map((coord) => {
        if (coord) {
          return projection(coord);
        }
      });
  }

  return {
    svgCoordinates,
  };
};
