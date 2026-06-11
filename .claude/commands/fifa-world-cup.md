# Copa do Mundo FIFA 2026

Busca os jogos da Copa do Mundo FIFA 2026 de um time específico e salva em `apps/web/public/fifa-games.json`.

## Passo 1 — Selecionar o time

Pergunte ao usuário qual seleção deseja buscar. Apresente as opções numeradas:

```
Qual seleção você quer buscar?
 1. Brasil (BRA)
 2. Argentina (ARG)
 3. França (FRA)
 4. Inglaterra (ENG)
 5. Alemanha (GER)
 6. Portugal (POR)
 7. Espanha (ESP)
 8. Uruguai (URU)
 9. Colômbia (COL)
10. México (MEX)
11. EUA (USA)
12. Outro (digitar o nome ou código)
```

## Passo 2 — Buscar todos os jogos via API

Execute o seguinte comando bash para buscar todos os jogos da Copa 2026:

```bash
curl -s "https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&count=200&language=pt"
```

Essa chamada retorna todos os ~104 jogos da Copa do Mundo 2026. Não adicione nenhum filtro extra.

## Passo 3 — Filtrar os jogos do time selecionado

A partir da lista de `Results`, mantenha apenas os jogos onde o time selecionado aparece como mandante (`Home`) ou visitante (`Away`).

Compare pelo campo `Abbreviation` de `Home` e `Away` (ex: `"BRA"`, `"ARG"`). Se o time ainda não tiver código definido (jogo de fase eliminatória sem times confirmados), ignore esse jogo.

## Passo 4 — Normalizar os jogos

Para cada jogo filtrado, crie um objeto no seguinte formato:

```json
{
  "id": "{HOME_CODE}_{AWAY_CODE}_{YYYY-MM-DD}",
  "homeTeam": { "name": "Brasil", "code": "BRA" },
  "awayTeam": { "name": "Marrocos", "code": "MAR" },
  "startISO": "2026-06-13T22:00:00Z",
  "endISO": "2026-06-14T00:00:00Z",
  "venue": "SoFi Stadium, Los Angeles",
  "stage": "Primeira fase",
  "status": "SCHEDULED"
}
```

Mapeamento dos campos da API:
- `id`: `{Home.Abbreviation}_{Away.Abbreviation}_{Date[0..9]}`
- `homeTeam.name`: `Home.TeamName[0].Description`
- `homeTeam.code`: `Home.Abbreviation`
- `awayTeam.name`: `Away.TeamName[0].Description`
- `awayTeam.code`: `Away.Abbreviation`
- `startISO`: campo `Date` (já vem em UTC ISO 8601)
- `endISO`: `startISO` + 2 horas
- `venue`: `Stadium.Name[0].Description + ", " + Stadium.CityName[0].Description` (se disponível)
- `stage`: `StageName[0].Description`
- `status`: `"SCHEDULED"` por padrão

## Passo 5 — Salvar

Escreva o resultado em `apps/web/public/fifa-games.json` no formato:

```json
{
  "games": [...],
  "fetchedTeams": ["BRA"],
  "lastUpdated": "2026-06-11T00:00:00Z"
}
```

Se o arquivo já existir com jogos de outro time, mescle os arrays e deduplique por `id`. Adicione o código do time em `fetchedTeams` se ainda não estiver.

## Passo 6 — Relatório

Informe ao usuário:
- Quantos jogos foram encontrados para o time
- Lista dos jogos com data, horário UTC, adversário e local
- Instrução: "O calendário agora mostrará ⚽ nos dias com jogo e bloqueará os horários correspondentes."
