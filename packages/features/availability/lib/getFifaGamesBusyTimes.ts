import type { EventBusyDetails } from "@calcom/types/Calendar";

import fifaCalendar from "../../../../fifa/calendario.json";

export function getFifaGamesBusyTimes(startTime: Date, endTime: Date): EventBusyDetails[] {
  return fifaCalendar.games.flatMap((game) => {
    const start = new Date(`${game.date}T${game.time}:00Z`);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    if (start >= endTime || end <= startTime) return [];
    return [{ start: start.toISOString(), end: end.toISOString(), title: `${game.team1} vs ${game.team2}`, source: "FIFA World Cup 2026" }];
  });
}
