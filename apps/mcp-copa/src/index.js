import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Copa do Mundo FIFA 2026 - Jogos
const COPA_2026_GAMES = [
  // Fase de Grupos - Junho 2026
  {
    id: "g001",
    date: "2026-06-11",
    time: "20:00",
    timezone: "America/New_York",
    homeTeam: "México",
    awayTeam: "TBD",
    group: "A",
    stage: "Fase de Grupos",
    venue: "Estadio Azteca",
    city: "Cidade do México",
    country: "México",
  },
  {
    id: "g002",
    date: "2026-06-12",
    time: "18:00",
    timezone: "America/New_York",
    homeTeam: "Estados Unidos",
    awayTeam: "TBD",
    group: "B",
    stage: "Fase de Grupos",
    venue: "SoFi Stadium",
    city: "Los Angeles",
    country: "EUA",
  },
  {
    id: "g003",
    date: "2026-06-13",
    time: "15:00",
    timezone: "America/Toronto",
    homeTeam: "Canadá",
    awayTeam: "TBD",
    group: "C",
    stage: "Fase de Grupos",
    venue: "BMO Field",
    city: "Toronto",
    country: "Canadá",
  },
  {
    id: "g004",
    date: "2026-06-14",
    time: "16:00",
    timezone: "America/New_York",
    homeTeam: "Brasil",
    awayTeam: "TBD",
    group: "D",
    stage: "Fase de Grupos",
    venue: "MetLife Stadium",
    city: "Nova York",
    country: "EUA",
  },
  {
    id: "g005",
    date: "2026-06-14",
    time: "21:00",
    timezone: "America/New_York",
    homeTeam: "Argentina",
    awayTeam: "TBD",
    group: "E",
    stage: "Fase de Grupos",
    venue: "Hard Rock Stadium",
    city: "Miami",
    country: "EUA",
  },
  {
    id: "g006",
    date: "2026-06-15",
    time: "18:00",
    timezone: "America/New_York",
    homeTeam: "Portugal",
    awayTeam: "TBD",
    group: "F",
    stage: "Fase de Grupos",
    venue: "Gillette Stadium",
    city: "Boston",
    country: "EUA",
  },
  {
    id: "g007",
    date: "2026-06-16",
    time: "15:00",
    timezone: "America/Chicago",
    homeTeam: "França",
    awayTeam: "TBD",
    group: "G",
    stage: "Fase de Grupos",
    venue: "AT&T Stadium",
    city: "Dallas",
    country: "EUA",
  },
  {
    id: "g008",
    date: "2026-06-17",
    time: "17:00",
    timezone: "America/New_York",
    homeTeam: "Alemanha",
    awayTeam: "TBD",
    group: "H",
    stage: "Fase de Grupos",
    venue: "Lincoln Financial Field",
    city: "Filadélfia",
    country: "EUA",
  },
  {
    id: "g009",
    date: "2026-06-18",
    time: "20:00",
    timezone: "America/Chicago",
    homeTeam: "Espanha",
    awayTeam: "TBD",
    group: "I",
    stage: "Fase de Grupos",
    venue: "Arrowhead Stadium",
    city: "Kansas City",
    country: "EUA",
  },
  {
    id: "g010",
    date: "2026-06-19",
    time: "16:00",
    timezone: "America/Los_Angeles",
    homeTeam: "Inglaterra",
    awayTeam: "TBD",
    group: "J",
    stage: "Fase de Grupos",
    venue: "Levi's Stadium",
    city: "San Francisco",
    country: "EUA",
  },
  {
    id: "g011",
    date: "2026-06-20",
    time: "15:00",
    timezone: "America/Chicago",
    homeTeam: "Países Baixos",
    awayTeam: "TBD",
    group: "K",
    stage: "Fase de Grupos",
    venue: "Estadio BBVA",
    city: "Monterrey",
    country: "México",
  },
  {
    id: "g012",
    date: "2026-06-21",
    time: "18:00",
    timezone: "America/Vancouver",
    homeTeam: "Uruguai",
    awayTeam: "TBD",
    group: "L",
    stage: "Fase de Grupos",
    venue: "BC Place",
    city: "Vancouver",
    country: "Canadá",
  },
  // Semifinais
  {
    id: "sf001",
    date: "2026-07-14",
    time: "20:00",
    timezone: "America/New_York",
    homeTeam: "TBD",
    awayTeam: "TBD",
    stage: "Semifinal",
    venue: "MetLife Stadium",
    city: "Nova York",
    country: "EUA",
  },
  {
    id: "sf002",
    date: "2026-07-15",
    time: "20:00",
    timezone: "America/Los_Angeles",
    homeTeam: "TBD",
    awayTeam: "TBD",
    stage: "Semifinal",
    venue: "SoFi Stadium",
    city: "Los Angeles",
    country: "EUA",
  },
  // Final
  {
    id: "final",
    date: "2026-07-19",
    time: "18:00",
    timezone: "America/New_York",
    homeTeam: "TBD",
    awayTeam: "TBD",
    stage: "Final",
    venue: "MetLife Stadium",
    city: "Nova York",
    country: "EUA",
  },
];

const server = new McpServer({
  name: "mcp-copa-2026",
  version: "0.1.0",
});

server.tool(
  "list_copa_games",
  "Lista os jogos da Copa do Mundo FIFA 2026. Pode filtrar por seleção, fase ou data.",
  {
    team: z.string().optional().describe("Nome da seleção para filtrar (ex: 'Brasil', 'Argentina')"),
    stage: z.string().optional().describe("Fase do torneio (ex: 'Fase de Grupos', 'Semifinal', 'Final')"),
    date: z.string().optional().describe("Data no formato YYYY-MM-DD para filtrar"),
  },
  async ({ team, stage, date }) => {
    let games = [...COPA_2026_GAMES];

    if (team) {
      const teamLower = team.toLowerCase();
      games = games.filter(
        (g) =>
          g.homeTeam.toLowerCase().includes(teamLower) ||
          g.awayTeam.toLowerCase().includes(teamLower)
      );
    }

    if (stage) {
      const stageLower = stage.toLowerCase();
      games = games.filter((g) => g.stage.toLowerCase().includes(stageLower));
    }

    if (date) {
      games = games.filter((g) => g.date === date);
    }

    if (games.length === 0) {
      return {
        content: [{ type: "text", text: "Nenhum jogo encontrado com os filtros informados." }],
      };
    }

    const formatted = games
      .map(
        (g) =>
          `🏆 ${g.stage}${g.group ? ` - Grupo ${g.group}` : ""}
📅 ${g.date} às ${g.time} (${g.timezone})
⚽ ${g.homeTeam} vs ${g.awayTeam}
🏟️  ${g.venue}, ${g.city}, ${g.country}
🆔 ID: ${g.id}`
      )
      .join("\n\n---\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Copa do Mundo FIFA 2026 — ${games.length} jogo(s):\n\n${formatted}`,
        },
      ],
    };
  }
);

server.tool(
  "get_copa_game_details",
  "Retorna detalhes completos de um jogo da Copa 2026 pelo ID.",
  {
    gameId: z.string().describe("ID do jogo (ex: 'g001', 'final')"),
  },
  async ({ gameId }) => {
    const game = COPA_2026_GAMES.find((g) => g.id === gameId);

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

    const details = [
      `🏆 Copa do Mundo FIFA 2026`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `⚽ ${game.homeTeam} vs ${game.awayTeam}`,
      `📅 Data: ${game.date}`,
      `🕐 Horário: ${game.time} (${game.timezone})`,
      `🏟️  Estádio: ${game.venue}`,
      `📍 Local: ${game.city}, ${game.country}`,
      `🏅 Fase: ${game.stage}${game.group ? ` - Grupo ${game.group}` : ""}`,
      `🆔 ID: ${game.id}`,
    ].join("\n");

    return {
      content: [{ type: "text", text: details }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP Copa 2026 server running on stdio");
