import { useEffect, useState } from "react";

export interface FifaGame {
  id: string;
  homeTeam: { name: string; code: string };
  awayTeam: { name: string; code: string };
  startISO: string;
  endISO: string;
  venue: string;
  stage: string;
  status?: string;
}

interface FifaGamesData {
  games: FifaGame[];
  fetchedTeams: string[];
  lastUpdated: string | null;
}

let cachedGames: FifaGame[] | null = null;
let cachePromise: Promise<FifaGame[]> | null = null;

function loadGames(): Promise<FifaGame[]> {
  if (cachedGames !== null) return Promise.resolve(cachedGames);
  if (cachePromise) return cachePromise;
  cachePromise = fetch("/fifa-games.json")
    .then((res) => res.json())
    .then((data: FifaGamesData) => {
      cachedGames = data.games ?? [];
      return cachedGames;
    })
    .catch(() => {
      cachedGames = [];
      return cachedGames as FifaGame[];
    });
  return cachePromise;
}

export function useFifaGames() {
  const [games, setGames] = useState<FifaGame[]>(cachedGames ?? []);
  const [isLoading, setIsLoading] = useState(cachedGames === null);

  useEffect(() => {
    if (cachedGames !== null) {
      setGames(cachedGames);
      setIsLoading(false);
      return;
    }
    loadGames().then((loaded) => {
      setGames(loaded);
      setIsLoading(false);
    });
  }, []);

  const getGameDates = (): string[] => {
    return [...new Set(games.map((g) => g.startISO.slice(0, 10)))];
  };

  const getGamesForDate = (dateStr: string): FifaGame[] => {
    return games.filter((g) => g.startISO.startsWith(dateStr));
  };

  const getGameForSlot = (slotTimeISO: string): FifaGame | null => {
    const slotMs = new Date(slotTimeISO).getTime();
    return (
      games.find((g) => {
        const start = new Date(g.startISO).getTime();
        const end = new Date(g.endISO).getTime();
        return slotMs >= start && slotMs < end;
      }) ?? null
    );
  };

  return { games, isLoading, getGameDates, getGamesForDate, getGameForSlot };
}
