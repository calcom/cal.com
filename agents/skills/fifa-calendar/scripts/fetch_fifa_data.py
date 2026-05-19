#!/usr/bin/env python3
"""
Fetches FIFA 2026 World Cup schedule and updates fifa/calendario.json.

Usage:
    python fetch_fifa_data.py [--output PATH]

Options:
    --output PATH   Path to the output JSON file (default: fifa/calendario.json)
"""
from __future__ import annotations

import json
import sys
import argparse
import urllib.request
import urllib.error
from datetime import datetime, timezone

OUTPUT_DEFAULT = "fifa/calendario.json"

FIFA_URLS = [
    "https://www.fifa.com/pt/tournaments/mens/worldcup/canadamexicousa2026/articles/copa-mundo-2026-tabela-jogos",
    "https://www.fifa.com/pt/tournaments/mens/worldcup/canadamexicousa2026/",
    "https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=255711&language=pt",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; CalDIY/1.0)",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
}

PHASE_MAP = {
    "group": "Fase de Grupos",
    "grupos": "Fase de Grupos",
    "round of 16": "Oitavas de Final",
    "oitavas": "Oitavas de Final",
    "quarter": "Quartas de Final",
    "quartas": "Quartas de Final",
    "semi": "Semifinal",
    "third": "Terceiro Lugar",
    "terceiro": "Terceiro Lugar",
    "final": "Final",
}


def fetch_url(url: str) -> str | None:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, urllib.error.HTTPError) as e:
        print(f"[WARN] Failed to fetch {url}: {e}", file=sys.stderr)
        return None


def parse_fifa_api(data: str) -> list[dict]:
    """Parse FIFA official API JSON response."""
    games = []
    try:
        payload = json.loads(data)
        results = payload.get("Results", [])
        for i, match in enumerate(results):
            date_str = match.get("Date", "")
            dt = None
            if date_str:
                try:
                    dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                except ValueError:
                    pass

            team1 = (match.get("Home", {}) or {}).get("TeamName", [{}])
            team2 = (match.get("Away", {}) or {}).get("TeamName", [{}])
            t1 = (team1[0].get("Description") if team1 else None) or "TBD"
            t2 = (team2[0].get("Description") if team2 else None) or "TBD"

            score_home = match.get("HomeTeamScore")
            score_away = match.get("AwayTeamScore")

            stadium = match.get("Stadium", {}) or {}
            venue = stadium.get("Name", [{}])
            venue_name = (venue[0].get("Description") if venue else None) or ""
            city_data = stadium.get("CityName", [{}])
            city = (city_data[0].get("Description") if city_data else None) or ""

            phase_raw = (match.get("MatchDay") or "").lower()
            phase = next((v for k, v in PHASE_MAP.items() if k in phase_raw), "Fase de Grupos")

            group_raw = match.get("GroupName", [{}])
            group_name = (group_raw[0].get("Description") if group_raw else None) or ""

            game: dict = {
                "id": f"WC2026-{(i + 1):03d}",
                "date": dt.strftime("%Y-%m-%d") if dt else "",
                "time": dt.strftime("%H:%M") if dt else "",
                "timezone": "UTC",
                "team1": t1,
                "team2": t2,
                "phase": phase,
                "score": {
                    "team1": int(score_home) if score_home is not None else None,
                    "team2": int(score_away) if score_away is not None else None,
                },
            }
            if venue_name:
                game["venue"] = venue_name
            if city:
                game["city"] = city
            if group_name:
                game["group"] = group_name

            games.append(game)
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        print(f"[WARN] Failed to parse API response: {e}", file=sys.stderr)
    return games


def parse_html_page(html: str) -> list[dict]:
    """
    Best-effort extraction of game data from FIFA's HTML pages.
    FIFA renders content dynamically so this may return an empty list —
    in that case the caller should fall back to the API URL.
    """
    games = []

    # Look for embedded JSON-LD or window.__INITIAL_STATE__ blocks
    import re
    json_blocks = re.findall(r'<script[^>]*type=["\']application/json["\'][^>]*>(.*?)</script>', html, re.S)
    json_blocks += re.findall(r'window\.__(?:INITIAL_STATE|DATA)__\s*=\s*(\{.*?\});', html, re.S)

    for block in json_blocks:
        try:
            data = json.loads(block)
            # Try known paths in FIFA's state objects
            matches = (
                data.get("matches")
                or data.get("schedule", {}).get("matches")
                or []
            )
            if isinstance(matches, list) and matches:
                for match in matches:
                    game = _extract_from_match_obj(match, len(games))
                    if game:
                        games.append(game)
        except (json.JSONDecodeError, AttributeError):
            continue

    return games


def _extract_from_match_obj(match: dict, index: int) -> dict | None:
    date_str = match.get("date") or match.get("startTime") or match.get("kickOffTime") or ""
    if not date_str:
        return None

    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None

    team1 = match.get("homeTeam", {}) or {}
    team2 = match.get("awayTeam", {}) or {}
    t1 = team1.get("name") or team1.get("shortName") or "TBD"
    t2 = team2.get("name") or team2.get("shortName") or "TBD"

    score_home = (match.get("score", {}) or {}).get("home")
    score_away = (match.get("score", {}) or {}).get("away")

    phase_raw = (match.get("stageName") or match.get("roundName") or "").lower()
    phase = next((v for k, v in PHASE_MAP.items() if k in phase_raw), "Fase de Grupos")

    return {
        "id": f"WC2026-{(index + 1):03d}",
        "date": dt.strftime("%Y-%m-%d"),
        "time": dt.strftime("%H:%M"),
        "timezone": "UTC",
        "team1": t1,
        "team2": t2,
        "venue": match.get("venue") or match.get("stadium") or "",
        "city": match.get("city") or "",
        "phase": phase,
        "score": {
            "team1": int(score_home) if score_home is not None else None,
            "team2": int(score_away) if score_away is not None else None,
        },
    }


def _game_key(game: dict) -> str:
    """Unique key to identify a game across fetches."""
    return f"{game['date']}_{game['team1']}_{game['team2']}"


def merge_games(existing: list[dict], fetched: list[dict]) -> tuple[list[dict], int, int]:
    """
    Merges fetched games into existing list.
    Returns (merged_list, added_count, updated_count).
    """
    index_by_id = {g["id"]: i for i, g in enumerate(existing)}
    index_by_key = {_game_key(g): i for i, g in enumerate(existing)}

    merged = list(existing)
    added = 0
    updated = 0

    for game in fetched:
        pos = index_by_id.get(game["id"]) if game.get("id") else None
        if pos is None:
            pos = index_by_key.get(_game_key(game))

        if pos is not None:
            old = merged[pos]
            changed = {k: game[k] for k in game if game[k] != old.get(k)}
            if changed:
                merged[pos] = {**old, **changed}
                updated += 1
        else:
            merged.append(game)
            added += 1

    return merged, added, updated


def load_existing(path: str) -> dict:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"tournament": "FIFA World Cup 2026", "games": []}
    except json.JSONDecodeError as e:
        print(f"[WARN] Could not parse existing JSON at {path}: {e}", file=sys.stderr)
        return {"tournament": "FIFA World Cup 2026", "games": []}


def save(path: str, data: dict) -> None:
    import os
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default=OUTPUT_DEFAULT, help="Output JSON path")
    args = parser.parse_args()

    fetched_games: list[dict] = []
    for url in FIFA_URLS:
        print(f"[INFO] Fetching {url} …")
        content = fetch_url(url)
        if not content:
            continue

        if "api.fifa.com" in url:
            games = parse_fifa_api(content)
        else:
            games = parse_html_page(content)

        if games:
            print(f"[INFO] Found {len(games)} games from {url}")
            fetched_games = games
            break
        else:
            print(f"[INFO] No games extracted from {url}, trying next source…")

    if not fetched_games:
        print("[ERROR] Could not retrieve any games from FIFA sources.", file=sys.stderr)
        sys.exit(1)

    existing_data = load_existing(args.output)
    merged, added, updated = merge_games(existing_data.get("games", []), fetched_games)

    existing_data["games"] = merged
    existing_data["updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    save(args.output, existing_data)
    print(f"[OK] {args.output} updated — {len(merged)} total games, {added} added, {updated} updated.")

    # Print summary for the calling agent to parse
    print(f"SUMMARY:total={len(merged)},added={added},updated={updated}")


if __name__ == "__main__":
    main()
