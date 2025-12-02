/**
 * Build script to extract holiday data from date-holidays library.
 * This runs at build time only - date-holidays is a devDependency.
 *
 * Run: npx ts-node packages/lib/holidays/scripts/generate-holiday-data.ts
 */
import Holidays from "date-holidays";
import * as fs from "fs";
import * as path from "path";

// Countries to support (~20 major countries)
const SUPPORTED_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "IT", name: "Italy" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "IN", name: "India" },
  { code: "IE", name: "Ireland" },
  { code: "NZ", name: "New Zealand" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "BE", name: "Belgium" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
];

// Generate dates for 2025 and 2026 only (2 years for now/next year coverage)
const YEARS_TO_GENERATE = 2;
const START_YEAR = 2025;

interface HolidayDate {
  year: number;
  date: string; // ISO date string YYYY-MM-DD
}

interface Holiday {
  id: string;
  name: string;
  type: string;
  dates: HolidayDate[];
}

interface CountryHolidays {
  code: string;
  name: string;
  holidays: Holiday[];
}

interface HolidayData {
  generatedAt: string;
  yearsIncluded: number[];
  countries: CountryHolidays[];
}

function generateHolidayId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function extractHolidaysForCountry(countryCode: string, countryName: string): CountryHolidays {
  const hd = new Holidays(countryCode);
  const holidayMap = new Map<string, Holiday>();

  for (let year = START_YEAR; year < START_YEAR + YEARS_TO_GENERATE; year++) {
    const holidays = hd.getHolidays(year);

    for (const holiday of holidays) {
      // Only include public holidays (skip observance, optional, etc.)
      if (holiday.type !== "public") continue;

      const id = generateHolidayId(holiday.name);
      const dateStr = holiday.date.split(" ")[0]; // Get just YYYY-MM-DD part

      if (!holidayMap.has(id)) {
        holidayMap.set(id, {
          id,
          name: holiday.name,
          type: holiday.type,
          dates: [],
        });
      }

      holidayMap.get(id)!.dates.push({
        year,
        date: dateStr,
      });
    }
  }

  // Sort holidays by their first occurrence date
  const holidays = Array.from(holidayMap.values()).sort((a, b) => {
    const dateA = a.dates[0]?.date || "";
    const dateB = b.dates[0]?.date || "";
    return dateA.localeCompare(dateB);
  });

  return {
    code: countryCode,
    name: countryName,
    holidays,
  };
}

function generateHolidayData(): HolidayData {
  console.log("🎄 Generating holiday data...\n");

  const yearsIncluded: number[] = [];
  for (let i = 0; i < YEARS_TO_GENERATE; i++) {
    yearsIncluded.push(START_YEAR + i);
  }

  const countries: CountryHolidays[] = [];

  for (const country of SUPPORTED_COUNTRIES) {
    console.log(`  Processing ${country.name} (${country.code})...`);
    const countryData = extractHolidaysForCountry(country.code, country.name);
    console.log(`    Found ${countryData.holidays.length} public holidays`);
    countries.push(countryData);
  }

  return {
    generatedAt: new Date().toISOString(),
    yearsIncluded,
    countries,
  };
}

function main() {
  const data = generateHolidayData();

  const outputPath = path.join(__dirname, "..", "data", "holidays.json");
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  const stats = fs.statSync(outputPath);
  const fileSizeKB = (stats.size / 1024).toFixed(2);

  console.log(`\n✅ Generated ${outputPath}`);
  console.log(`   File size: ${fileSizeKB} KB`);
  console.log(`   Countries: ${data.countries.length}`);
  console.log(`   Years: ${data.yearsIncluded.join(", ")}`);
}

main();
