import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const DATA_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// Cache simples em memória com TTL de 10 minutos
let cache = null;
let cacheAt = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

async function fetchGames() {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_TTL_MS) {
    return cache;
  }

  const res = await fetch(DATA_URL);
  if (!res.ok) {
    throw new Error(`Falha ao buscar dados: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  cache = data.matches ?? [];
  cacheAt = now;
  return cache;
}

function formatGame(g, index) {
  const id = String(index + 1).padStart(3, "0");
  const stage = g.group ?? g.round ?? "Fase Eliminatória";
  const round = g.round ?? "";
  const venue = g.ground ?? "TBD";

  return {
    id: `g${id}`,
    date: g.date,
    time: g.time ?? "TBD",
    homeTeam: g.team1,
    awayTeam: g.team2,
    group: g.group ?? null,
    round: round,
    stage,
    venue,
    score: g.score ?? null,
  };
}

function formatGameText(g) {
  const lines = [
    `🏆 ${g.stage}${g.round && g.round !== g.stage ? ` — ${g.round}` : ""}`,
    `📅 ${g.date} às ${g.time}`,
    `⚽ ${g.homeTeam} vs ${g.awayTeam}`,
    g.score ? `📊 Placar: ${g.score}` : null,
    `🏟️  ${g.venue}`,
    `🆔 ID: ${g.id}`,
  ]
    .filter(Boolean)
    .join("\n");
  return lines;
}

const server = new McpServer({
  name: "mcp-copa-2026",
  version: "0.2.0",
});

server.tool(
  "list_copa_games",
  "Lista os jogos da Copa do Mundo FIFA 2026 com dados em tempo real. Filtre por seleção, fase/grupo ou data.",
  {
    team: z
      .string()
      .optional()
      .describe("Nome da seleção (ex: 'Brazil', 'Argentina', 'Portugal')"),
    stage: z
      .string()
      .optional()
      .describe(
        "Fase ou grupo (ex: 'Group A', 'Round of 32', 'Semi-final', 'Final')"
      ),
    date: z
      .string()
      .optional()
      .describe("Data no formato YYYY-MM-DD"),
  },
  async ({ team, stage, date }) => {
    let matches;
    try {
      matches = await fetchGames();
    } catch (err) {
      return {
        content: [{ type: "text", text: `Erro ao buscar dados: ${err.message}` }],
      };
    }

    let games = matches.map(formatGame);

    if (team) {
      const t = team.toLowerCase();
      games = games.filter(
        (g) =>
          g.homeTeam.toLowerCase().includes(t) ||
          g.awayTeam.toLowerCase().includes(t)
      );
    }

    if (stage) {
      const s = stage.toLowerCase();
      games = games.filter(
        (g) =>
          g.stage.toLowerCase().includes(s) ||
          g.round.toLowerCase().includes(s)
      );
    }

    if (date) {
      games = games.filter((g) => g.date === date);
    }

    if (games.length === 0) {
      return {
        content: [
          { type: "text", text: "Nenhum jogo encontrado com os filtros informados." },
        ],
      };
    }

    const body = games.map(formatGameText).join("\n\n---\n\n");
    return {
      content: [
        {
          type: "text",
          text: `Copa do Mundo FIFA 2026 — ${games.length} jogo(s):\n\n${body}`,
        },
      ],
    };
  }
);

server.tool(
  "get_copa_game_details",
  "Retorna detalhes de um jogo da Copa 2026 pelo ID (use list_copa_games para descobrir IDs).",
  {
    gameId: z.string().describe("ID do jogo (ex: 'g001', 'g104')"),
  },
  async ({ gameId }) => {
    let matches;
    try {
      matches = await fetchGames();
    } catch (err) {
      return {
        content: [{ type: "text", text: `Erro ao buscar dados: ${err.message}` }],
      };
    }

    const games = matches.map(formatGame);
    const game = games.find((g) => g.id === gameId);

    if (!game) {
      return {
        content: [
          {
            type: "text",
            text: `Jogo "${gameId}" não encontrado. Use list_copa_games para ver os IDs disponíveis.`,
          },
        ],
      };
    }

    return {
      content: [{ type: "text", text: formatGameText(game) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP Copa 2026 server v0.2.0 running (fonte: openfootball/worldcup.json)");
