import type { EventBusyDetails } from "@calcom/types/Calendar";

import fifaCalendar from "../../../../fifa/calendario.json";

const FIFA_GAME_DURATION_HOURS = 2;

export function getFifaGamesBusyTimes(startTime: Date, endTime: Date): EventBusyDetails[] {
  const busyTimes: EventBusyDetails[] = [];

  for (const game of fifaCalendar.games) {
    const gameStart = new Date(`${game.date}T${game.time}:00Z`);
    const gameEnd = new Date(gameStart.getTime() + FIFA_GAME_DURATION_HOURS * 60 * 60 * 1000);

    if (gameStart >= endTime || gameEnd <= startTime) continue;

    busyTimes.push({
      start: gameStart.toISOString(),
      end: gameEnd.toISOString(),
      title: `${game.team1} vs ${game.team2} (${fifaCalendar.tournament})`,
      source: "FIFA World Cup 2026",
    });
  }

  return busyTimes;
}
