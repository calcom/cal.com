"use client";

import { useState } from "react";

import { DayPicker } from "react-day-picker";

import type { Game } from "~/fifa/lib/data";
import Shell from "~/shell/Shell";

type FifaCalendarViewProps = {
  tournament: string;
  games: Game[];
};

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function FifaCalendarView({ tournament, games }: FifaCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const gamesByDate = games.reduce<Record<string, Game[]>>((acc, game) => {
    if (!acc[game.date]) acc[game.date] = [];
    acc[game.date].push(game);
    return acc;
  }, {});

  // Use noon UTC to avoid timezone edge cases when creating Date objects from YYYY-MM-DD strings
  const gameDates = Object.keys(gamesByDate).map((date) => new Date(`${date}T12:00:00Z`));

  const firstGameDate = gameDates.length > 0 ? gameDates[0] : undefined;
  const lastGameDate = gameDates.length > 0 ? gameDates[gameDates.length - 1] : undefined;

  const selectedDateKey = selectedDate ? toLocalDateKey(selectedDate) : null;
  const gamesForSelectedDate = selectedDateKey ? (gamesByDate[selectedDateKey] ?? []) : [];

  return (
    <Shell heading={tournament}>
      <div className="mx-auto max-w-4xl">
        <div className="bg-default border-subtle rounded-lg border p-4 shadow-sm">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            fromDate={firstGameDate}
            toDate={lastGameDate}
            modifiers={{ hasGame: gameDates }}
            modifiersClassNames={{
              hasGame:
                "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-green-500",
              selected: "bg-inverted! text-inverted! rounded-md",
            }}
            classNames={{
              months: "flex flex-col",
              month: "space-y-4",
              caption: "flex pt-1 relative items-center justify-between px-2",
              caption_label: "text-sm font-semibold text-emphasis",
              nav: "flex items-center gap-1",
              nav_button:
                "inline-flex items-center justify-center rounded-md p-1 hover:bg-emphasis transition-colors",
              nav_button_previous: "",
              nav_button_next: "",
              table: "w-full border-collapse",
              head_row: "flex",
              head_cell: "text-subtle rounded-md w-9 font-normal text-xs text-center",
              row: "flex w-full mt-1",
              cell: "text-center text-sm p-0 relative w-9 h-9",
              day: "inline-flex items-center justify-center rounded-md w-9 h-9 text-sm font-medium hover:bg-emphasis transition-colors cursor-pointer",
              day_outside: "text-muted opacity-50",
              day_disabled: "text-muted opacity-30 cursor-default",
              day_today: "font-bold text-emphasis",
            }}
          />
        </div>

        {selectedDate && gamesForSelectedDate.length === 0 && (
          <div className="text-subtle mt-4 text-center text-sm">No games on this day.</div>
        )}

        {gamesForSelectedDate.length > 0 && (
          <div className="mt-4 space-y-3">
            <h2 className="text-emphasis font-semibold">
              {selectedDate?.toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h2>
            {gamesForSelectedDate.map((game) => (
              <div
                key={game.id}
                className="bg-default border-subtle flex items-center justify-between rounded-lg border p-4 shadow-sm">
                <div className="flex flex-1 flex-col">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-emphasis min-w-0 flex-1 text-right font-semibold">{game.team1}</span>
                    {game.score ? (
                      <span className="text-default shrink-0 text-xl font-bold tabular-nums">
                        {game.score.team1} – {game.score.team2}
                      </span>
                    ) : (
                      <span className="text-subtle shrink-0 text-sm">vs</span>
                    )}
                    <span className="text-emphasis min-w-0 flex-1 font-semibold">{game.team2}</span>
                  </div>
                  <div className="text-subtle mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span>{game.time} {game.timezone}</span>
                    {game.group && <span>{game.group}</span>}
                    <span>{game.phase}</span>
                    <span>
                      {game.venue}, {game.city}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
