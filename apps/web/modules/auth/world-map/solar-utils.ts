/**
 * Solar position calculations for the world map day/night cycle.
 *
 * Based on:
 * - NOAA Solar Calculator: https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 * - NOAA Excel spreadsheet: https://gml.noaa.gov/grad/solcalc/NOAA_Solar_Calculations_day.xls
 */

import {
  DEG_TO_RAD,
  RAD_TO_DEG,
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MINUTES_PER_HOUR,
  SECONDS_PER_MINUTE,
  HOURS_IN_HALF_DAY,
  UNIX_EPOCH_JULIAN_DATE,
  J2000_JULIAN_DATE,
  DAYS_PER_JULIAN_CENTURY,
} from "./constants";

// ── Mean orbital elements at J2000.0 (degrees) ─────────────
const MEAN_LONGITUDE_BASE = 280.46646;
const MEAN_LONGITUDE_RATE = 36_000.76983;
const MEAN_LONGITUDE_RATE2 = 0.0003032;

const MEAN_ANOMALY_BASE = 357.52911;
const MEAN_ANOMALY_RATE = 35_999.05029;
const MEAN_ANOMALY_RATE2 = 0.0001537;

// ── Equation of center coefficients ─────────────────────────
const CENTER_C1_BASE = 1.914602;
const CENTER_C1_RATE = 0.004817;
const CENTER_C1_RATE2 = 0.000014;
const CENTER_C2_BASE = 0.019993;
const CENTER_C2_RATE = 0.000101;
const CENTER_C3 = 0.000289;

// ── Nutation & aberration ───────────────────────────────────
const NUTATION_OMEGA_BASE = 125.04;
const NUTATION_OMEGA_RATE = 1934.136;
const ABERRATION_CORRECTION = 0.00569;
const NUTATION_LNG_CORRECTION = 0.00478;
const NUTATION_OBLIQUITY_CORRECTION = 0.00256;

// ── Obliquity of the ecliptic (Earth's axial tilt) ──────────
const OBLIQUITY_DEG = 23;
const OBLIQUITY_MIN = 26;
const OBLIQUITY_SEC = 21.448;
const OBLIQUITY_RATE1 = 46.815;
const OBLIQUITY_RATE2 = 0.00059;
const OBLIQUITY_RATE3 = 0.001813;

// ── Earth orbit eccentricity (dimensionless) ────────────────
const ECCENTRICITY_BASE = 0.016708634;
const ECCENTRICITY_RATE = 0.000042037;
const ECCENTRICITY_RATE2 = 0.0000001267;

// ── Solar time ──────────────────────────────────────────────
const NOON_UTC_MINUTES = 720; // 12:00 UTC in minutes
const DEGREES_PER_MINUTE_OF_TIME = 0.25; // Earth rotates 360° in 1440 min
const EQT_SCALE = 4 * RAD_TO_DEG;

// ── Twilight thresholds ─────────────────────────────────────
// US Naval Observatory definition of civil twilight:
// https://aa.usno.navy.mil/faq/twilight
const HORIZON_ELEVATION = 0.0;
const CIVIL_TWILIGHT_ELEVATION = -0.105;

function toJulianCenturies(date: Date): number {
  const julianDate = date.getTime() / MS_PER_DAY + UNIX_EPOCH_JULIAN_DATE;
  return (julianDate - J2000_JULIAN_DATE) / DAYS_PER_JULIAN_CENTURY;
}

function toRadians(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

export function getSunPosition(date: Date): {
  declination: number;
  subSolarLng: number;
} {
  const T = toJulianCenturies(date);

  // Geometric mean longitude of the sun (degrees)
  const L0 =
    (MEAN_LONGITUDE_BASE +
      T * (MEAN_LONGITUDE_RATE + T * MEAN_LONGITUDE_RATE2)) %
    360;

  // Mean anomaly of the sun (degrees → radians)
  const M =
    (MEAN_ANOMALY_BASE + T * (MEAN_ANOMALY_RATE - T * MEAN_ANOMALY_RATE2)) %
    360;
  const Mrad = toRadians(M);

  // Equation of center: correction from mean to true position
  const C =
    (CENTER_C1_BASE - T * (CENTER_C1_RATE + T * CENTER_C1_RATE2)) *
      Math.sin(Mrad) +
    (CENTER_C2_BASE - T * CENTER_C2_RATE) * Math.sin(2 * Mrad) +
    CENTER_C3 * Math.sin(3 * Mrad);

  // Sun's true longitude
  const sunTrueLng = L0 + C;

  // Apparent longitude (correcting for nutation & aberration)
  const omega = NUTATION_OMEGA_BASE - NUTATION_OMEGA_RATE * T;
  const apparentLng =
    sunTrueLng -
    ABERRATION_CORRECTION -
    NUTATION_LNG_CORRECTION * Math.sin(toRadians(omega));
  const apparentLngRad = toRadians(apparentLng);

  // Mean obliquity of the ecliptic (Earth's axial tilt)
  const meanObliquity =
    OBLIQUITY_DEG +
    (OBLIQUITY_MIN +
      (OBLIQUITY_SEC -
        T * (OBLIQUITY_RATE1 + T * (OBLIQUITY_RATE2 - T * OBLIQUITY_RATE3))) /
        SECONDS_PER_MINUTE) /
      MINUTES_PER_HOUR;
  // Corrected obliquity (with nutation)
  const obliquity =
    meanObliquity + NUTATION_OBLIQUITY_CORRECTION * Math.cos(toRadians(omega));
  const obliquityRad = toRadians(obliquity);

  // Solar declination (angle of sun above/below equator)
  const declination = Math.asin(
    Math.sin(obliquityRad) * Math.sin(apparentLngRad)
  );

  // Equation of time: difference between apparent and mean solar time (minutes)
  const y = Math.tan(obliquityRad / 2) ** 2;
  const L0rad = toRadians(L0);
  const eccentricity =
    ECCENTRICITY_BASE - T * (ECCENTRICITY_RATE + T * ECCENTRICITY_RATE2);
  const equationOfTime =
    EQT_SCALE *
    (y * Math.sin(2 * L0rad) -
      2 * eccentricity * Math.sin(Mrad) +
      4 * eccentricity * y * Math.sin(Mrad) * Math.cos(2 * L0rad) -
      0.5 * y * y * Math.sin(4 * L0rad) -
      1.25 * eccentricity * eccentricity * Math.sin(2 * Mrad));

  // Subsolar longitude: where the sun is directly overhead right now
  const utcMinutes =
    date.getUTCHours() * MINUTES_PER_HOUR +
    date.getUTCMinutes() +
    date.getUTCSeconds() / SECONDS_PER_MINUTE;
  const subSolarLng =
    -(utcMinutes - NOON_UTC_MINUTES + equationOfTime) *
    DEGREES_PER_MINUTE_OF_TIME;

  return { declination, subSolarLng };
}

/**
 * Uses the standard solar elevation formula:
 *   sin(altitude) = sin(lat)·sin(dec) + cos(lat)·cos(dec)·cos(hourAngle)
 */
export function getDaylightAmount(
  lat: number,
  lng: number,
  declination: number,
  subSolarLng: number
): number {
  const latRad = toRadians(lat);

  // Hour angle: how far east/west the point is from the subsolar longitude
  let hourAngle = toRadians(lng - subSolarLng);
  // Normalize to -π…π
  hourAngle =
    ((((hourAngle + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) -
    Math.PI;

  // Solar elevation (sin of altitude angle above horizon)
  const sinElevation =
    Math.sin(latRad) * Math.sin(declination) +
    Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle);

  // Smooth blend between civil twilight and horizon
  const t =
    (sinElevation - CIVIL_TWILIGHT_ELEVATION) /
    (HORIZON_ELEVATION - CIVIL_TWILIGHT_ELEVATION);
  return Math.max(0, Math.min(1, t));
}

export function getLocalTime(offsetHours: number, baseDate?: Date): string {
  const now = baseDate ?? new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * MS_PER_MINUTE;
  const local = new Date(utc + offsetHours * MS_PER_HOUR);
  const h = local.getHours();
  const m = local.getMinutes().toString().padStart(2, "0");
  const ampm = h >= HOURS_IN_HALF_DAY ? "PM" : "AM";
  const h12 = h % HOURS_IN_HALF_DAY || HOURS_IN_HALF_DAY;
  return `${h12}:${m} ${ampm}`;
}
