---
name: worldcup-fixtures
description: Fetch 2026 FIFA World Cup match fixtures from the official FIFA API, update a local JSON file, and add newly fetched games to the Cal.diy app calendar. Merges new games without duplicating existing ones, then opens a PR with the updated data. Use when asked to update World Cup fixtures, sync FIFA schedule, refresh World Cup game times, add World Cup games to calendar, or fetch match data for a specific country.
---

# World Cup Fixtures Updater

## Quick start

```
/worldcup-fixtures country=BR
```

Fetches all 2026 FIFA World Cup matches for the given country filter, merges them into `data/worldcup-2026-fixtures.json`, and opens a draft PR.

## Workflow

1. **Accept parameters**
   - `country` (required) — FIFA country code (e.g. `BR`, `US`, `DE`). Filters to matches involving that country.
   - `output` (optional) — path to the local fixtures file (default: `data/worldcup-2026-fixtures.json`).

2. **Fetch from FIFA API**

   The tournament spans ~2 months; a single API call may not return all matches. Make **two requests** using date-window splits to ensure complete coverage:

   ```
   # Request 1 — group stage + round of 16
   GET https://api.fifa.com/api/v3/calendar/matches
     ?idCompetition=17
     &idSeason=285023
     &count=500
     &language=en
     &from=2026-06-01T00:00:00Z
     &to=2026-07-01T00:00:00Z

   # Request 2 — quarter-finals through final
   GET https://api.fifa.com/api/v3/calendar/matches
     ?idCompetition=17
     &idSeason=285023
     &count=500
     &language=en
     &from=2026-07-01T00:00:00Z
     &to=2026-07-20T00:00:00Z
   ```

   Merge results from both requests by `IdMatch` before filtering.

   Key response fields per match:
   | Field | Description |
   |---|---|
   | `IdMatch` | Unique match ID — use as deduplication key |
   | `Date` | UTC datetime string (`2026-06-11T19:00:00Z`) |
   | `LocalDate` | Local kickoff time |
   | `StageName[0].Description` | Phase (Group Stage, Round of 16…) |
   | `GroupName[0].Description` | Group letter (null for knockout rounds) |
   | `Home.IdCountry` | Home team's FIFA country code |
   | `Home.TeamName[0].Description` | Home team name |
   | `Away.IdCountry` | Away team's FIFA country code |
   | `Away.TeamName[0].Description` | Away team name |
   | `Stadium.Name[0].Description` | Venue name |
   | `Stadium.CityName[0].Description` | Host city |
   | `MatchStatus` | `0` = scheduled, `1` = live, `3` = finished |

3. **Filter by country** — keep only matches where either `Home.IdCountry` or `Away.IdCountry` equals the requested country code. Check **both** fields for every match — a country can appear as home or away in any match. If no country filter is requested keep all matches.

4. **Load the existing file** — read `output` path. If the file doesn't exist, treat the existing list as `[]`.

5. **Merge without duplicates** — build a set of existing `IdMatch` values. Append only matches whose `IdMatch` is not already present. Never modify existing entries.

6. **Write the updated file** — output format:

   ```json
   {
     "updatedAt": "2026-05-19T14:00:00Z",
     "country": "BR",
     "matches": [
       {
         "id": "300438203",
         "date": "2026-06-11T19:00:00Z",
         "localDate": "2026-06-11T15:00:00Z",
         "stage": "Group Stage",
         "group": "Group F",
         "home": "Brazil",
         "away": "Mexico",
         "venue": "SoFi Stadium",
         "city": "Los Angeles",
         "status": "scheduled"
       }
     ]
   }
   ```

   Map `MatchStatus` → `status`: `0` → `"scheduled"`, `1` → `"live"`, `3` → `"finished"`.

7. **Matches are shown as busy times in the Cal.diy scheduling calendar** — the fixtures JSON file is read server-side by `packages/features/busyTimes/lib/getWorldCupBusyTimes.ts`, which injects the matches as `EventBusyDetails` into the availability engine in `packages/features/availability/lib/getUserAvailability.ts`. No extra step is needed here — updating the JSON file is sufficient to make the matches appear as busy on the scheduling page.

8. **Report the result** — print a summary:
   - How many matches were fetched from the API
   - How many were new (added)
   - How many were skipped (already existed)
   - Total matches now in the file

9. **Open a draft PR** — commit the updated file and open a draft PR with title:
   ```
   chore(fixtures): update 2026 World Cup fixtures for [COUNTRY] ([DATE])
   ```

## Notes

- The FIFA API returns UTC dates. Always preserve both `Date` (UTC) and `LocalDate` in the output so callers can choose.
- `IdSeason=285023` is the 2026 FIFA World Cup Canada/Mexico/USA season ID.
- `IdCompetition=17` is the FIFA World Cup competition ID (permanent).
- The API supports `from` and `to` query params (ISO datetime) if you need to limit the date window.
- If the API returns no matches, warn the user — the season ID may have changed. Verify at: `https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&count=5&language=en&from=2026-01-01T00:00:00Z`
