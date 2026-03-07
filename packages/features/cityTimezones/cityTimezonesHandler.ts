import { computeCityTimezones } from "./computeCityTimezones";

export type CityTimezones = ReturnType<typeof computeCityTimezones>;

export const cityTimezonesHandler = async () => {
  return computeCityTimezones();
};

export default cityTimezonesHandler;
