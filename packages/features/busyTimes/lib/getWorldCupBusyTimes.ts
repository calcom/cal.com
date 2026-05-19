import fs from "node:fs";
import path from "node:path";

import type { EventBusyDetails } from "@calcom/types/Calendar";

const FIXTURES_PATH = path.resolve(__dirname, "../../../../data/worldcup-2026-fixtures.json");
const SOURCE = "worldcup-2026";

interface WorldCupMatch {
  id: string;
  date: string;
  localDate: string;
  stage: string;
  group: string | null;
  home: string | null;
  away: string | null;
  venue: string | null;
  city: string | null;
  status: string;
}

interface WorldCupFixtures {
  updatedAt: string;
  country: string;
  matches: WorldCupMatch[];
}

function loadFixtures(): WorldCupMatch[] {
  try {
    const raw = fs.readFileSync(FIXTURES_PATH, "utf-8");
    const data = JSON.parse(raw) as WorldCupFixtures;
    return data.matches ?? [];
  } catch {
    return [];
  }
}

// Each match is ~2 hours; block the slot so it shows as busy during scheduling.
export function getWorldCupBusyTimes(dateFrom: Date, dateTo: Date): EventBusyDetails[] {
  const matches = loadFixtures();
  const result: EventBusyDetails[] = [];

  for (const match of matches) {
    const start = new Date(match.date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    if (end <= dateFrom || start >= dateTo) continue;

    result.push({
      start: start.toISOString(),
      end: end.toISOString(),
      title: `${match.home ?? "TBD"} vs ${match.away ?? "TBD"} — FIFA World Cup 2026`,
      source: SOURCE,
    });
  }

  return result;
}
