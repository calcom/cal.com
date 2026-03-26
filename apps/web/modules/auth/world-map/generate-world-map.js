#!/usr/bin/env node
/**
 * World Map Dot Grid Generator
 *
 * Generates a binary dot grid from Natural Earth GeoJSON data.
 * No dependencies — uses only Node.js built-ins + a GeoJSON file.
 *
 * Usage:
 *   1. Download GeoJSON: curl -sL "https://raw.githubusercontent.com/NTag/dotted-map/main/src/countries.geo.json" -o /tmp/countries.geo.json
 *   2. Run: node generate-world-map.js /tmp/countries.geo.json
 *
 * Outputs TypeScript array to stdout.
 */

const fs = require("node:fs");

const geojsonPath = process.argv[2] || "/tmp/countries.geo.json";
if (!fs.existsSync(geojsonPath)) {
  console.error(`GeoJSON file not found: ${geojsonPath}`);
  console.error(
    'Download it: curl -sL "https://raw.githubusercontent.com/NTag/dotted-map/main/src/countries.geo.json" -o /tmp/countries.geo.json'
  );
  process.exit(1);
}

const geo = JSON.parse(fs.readFileSync(geojsonPath, "utf-8"));

// ── Ray-casting point-in-polygon ──────────────────────────────────
/** @param {number} x @param {number} y @param {number[][]} ring */
function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0],
      yi = ring[i][1];
    const xj = ring[j][0],
      yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ── Test point against GeoJSON geometry (handles holes) ───────────
/** @param {number} lon @param {number} lat @param {{ type: string, coordinates: number[][][][] | number[][][] }} geometry */
function pointInGeometry(lon, lat, geometry) {
  const polygons =
    geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : [];

  for (const polygon of polygons) {
    if (pointInRing(lon, lat, polygon[0])) {
      let inHole = false;
      for (let h = 1; h < polygon.length; h++) {
        if (pointInRing(lon, lat, polygon[h])) {
          inHole = true;
          break;
        }
      }
      if (!inHole) return true;
    }
  }
  return false;
}

/** @param {number} lon @param {number} lat */
function isLand(lon, lat) {
  for (const feature of geo.features) {
    if (pointInGeometry(lon, lat, feature.geometry)) return true;
  }
  return false;
}

// ── Generate grid ─────────────────────────────────────────────────
const COLS = 200;
const ROWS = 100;
const LAT_MIN = -60; // Skip deep Antarctica
const LAT_MAX = 85; // Skip deep Arctic

const rows = [];
let landCount = 0;

for (let r = 0; r < ROWS; r++) {
  let row = "";
  const lat = LAT_MAX - (r / (ROWS - 1)) * (LAT_MAX - LAT_MIN);
  for (let c = 0; c < COLS; c++) {
    const lon = -180 + (c / (COLS - 1)) * 360;
    const land = isLand(lon, lat);
    row += land ? "1" : "0";
    if (land) landCount++;
  }
  rows.push(row);
}

// ── Output ────────────────────────────────────────────────────────
console.log("// Auto-generated world map dot grid");
console.log(`// ${COLS}x${rows.length} (${landCount} land dots)`);
console.log(`// Lat range: ${LAT_MIN} to ${LAT_MAX}`);
console.log("// Generated from Natural Earth GeoJSON (180 countries)");
console.log("const WORLD_MAP_ROWS: string[] = [");
for (const row of rows) {
  console.log(`  "${row}",`);
}
console.log("];");
console.log(`const MAP_COLS = ${COLS};`);
console.log(`const MAP_ROWS = ${rows.length};`);
