import rawData from "../../../../../fifa/calendario.json";

export type Game = {
  id: string;
  date: string;
  time: string;
  timezone: string;
  team1: string;
  team2: string;
  phase: string;
  score: { team1: number; team2: number } | null;
  venue: string;
  city: string;
  group?: string;
};

export type FifaCalendarData = {
  tournament: string;
  games: Game[];
};

export function getFifaCalendarData(): FifaCalendarData {
  return rawData as FifaCalendarData;
}
