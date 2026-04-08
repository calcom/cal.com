#!/usr/bin/env node

/**
 * Axiom Log Fetcher
 *
 * Fetches logs from Axiom's APL API via a browser session (agent-browser --auto-connect).
 * Axiom virtualizes its log table, so DOM scraping misses rows. Instead, this script
 * replays the same POST /api/v1/datasets/_apl call the UI makes, using the browser's
 * session cookies for auth.
 *
 * Usage:
 *   node axiom-logs.js --org <org-id> --query '<APL query>' [--start <ISO>] [--end <ISO>] [--dataset <name>]
 *
 * Examples:
 *   node axiom-logs.js --org cal-2e7u --query "['vercel'] | where ['request.id'] == 'abc123'"
 *   node axiom-logs.js --org cal-2e7u --dataset vercel --filter 'request.id' --value 'abc123'
 *   node axiom-logs.js --org cal-2e7u --query "['vercel'] | where message contains 'error'" --start 2026-03-31 --end 2026-04-01
 */

const { execSync } = require("child_process");
const { writeFileSync, unlinkSync } = require("fs");
const { join } = require("path");
const { tmpdir } = require("os");

function run(cmd) {
  return execSync(cmd, { encoding: "utf-8", timeout: 60000 }).trim();
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, "");
    if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
      args[key] = argv[++i];
    } else {
      args[key] = true;
    }
  }
  return args;
}

function buildQuery(args) {
  if (args.query) return args.query;
  const dataset = args.dataset || "vercel";
  let apl = `['${dataset}']`;
  if (args.filter && args.value) {
    apl += ` | where ['${args.filter}'] == '${args.value}'`;
  }
  return apl;
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.org) {
    console.error("Error: --org is required (e.g. --org cal-2e7u)");
    process.exit(1);
  }

  if (!args.query && !args.filter) {
    console.error(
      "Error: provide --query '<APL>' or --filter <field> --value <val>"
    );
    process.exit(1);
  }

  const apl = buildQuery(args);
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const startTime = args.start
    ? new Date(args.start).toISOString()
    : oneDayAgo.toISOString();
  const endTime = args.end
    ? new Date(args.end).toISOString()
    : now.toISOString();

  // First ensure we're on the Axiom domain (needed for cookie scope)
  const currentUrl = run(
    'agent-browser --auto-connect eval "document.location.href" 2>/dev/null || echo ""'
  );
  if (!currentUrl.includes("app.axiom.co")) {
    console.error("Navigating to Axiom to establish cookie scope...");
    run(
      `agent-browser --auto-connect open "https://app.axiom.co/${args.org}/query" 2>/dev/null`
    );
    run("agent-browser --auto-connect wait 2000 2>/dev/null");
  }

  // Build the Axiom stream UI URL so the user can open it directly
  const dataset = args.dataset || "vercel";
  // Extract filters from APL and build the stream q param (JSON filter format)
  const filterChildren = [];
  const whereMatches = apl.matchAll(/where\s+\['([^']+)'\]\s*==\s*'([^']+)'/g);
  for (const m of whereMatches) {
    filterChildren.push({ op: "==", field: m[1], value: m[2] });
  }
  const qParam = filterChildren.length > 0
    ? encodeURIComponent(JSON.stringify({ op: "and", field: "", children: filterChildren }))
    : "";
  const axiomUrl = `https://app.axiom.co/${args.org}/stream/${dataset}${qParam ? `?q=${qParam}` : ""}`;

  // Write the fetch script to a temp file to avoid shell escaping issues
  const tmpFile = join(tmpdir(), `axiom-query-${Date.now()}.js`);
  const fetchScript = `
(async () => {
  try {
    const resp = await fetch('/api/v1/datasets/_apl?format=tabular', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AXIOM-ORG-ID': '${args.org}'
      },
      body: JSON.stringify({
        apl: ${JSON.stringify(apl)},
        startTime: ${JSON.stringify(startTime)},
        endTime: ${JSON.stringify(endTime)}
      }),
      credentials: 'include'
    });

    if (!resp.ok) {
      const text = await resp.text();
      return JSON.stringify({ error: true, status: resp.status, body: text });
    }

    const data = await resp.json();
    const t = data.tables && data.tables[0];
    if (!t) return JSON.stringify({ error: true, message: 'No tables in response' });

    const fields = t.fields.map(function(f) { return f.name; });
    const cols = t.columns;
    const rows = [];
    for (var i = 0; i < (cols[0] ? cols[0].length : 0); i++) {
      var row = {};
      fields.forEach(function(f, c) {
        var val = cols[c][i];
        if (val != null && val !== '') row[f] = val;
      });
      rows.push(row);
    }

    return JSON.stringify({
      query: ${JSON.stringify(apl)},
      timeRange: { start: ${JSON.stringify(startTime)}, end: ${JSON.stringify(endTime)} },
      status: data.status,
      rowCount: rows.length,
      rows: rows,
      axiomUrl: ${JSON.stringify(axiomUrl)}
    });
  } catch(e) {
    return JSON.stringify({ error: true, message: e.message });
  }
})()
`.trim();

  writeFileSync(tmpFile, fetchScript, "utf-8");

  let rawResult;
  try {
    rawResult = run(
      `agent-browser --auto-connect eval "$(cat '${tmpFile}')"`
    );
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }

  // agent-browser wraps the result in quotes, parse it
  let result;
  try {
    const unquoted =
      rawResult.startsWith('"') && rawResult.endsWith('"')
        ? JSON.parse(rawResult)
        : rawResult;
    result = JSON.parse(unquoted);
  } catch {
    console.error("Failed to parse response:", rawResult);
    process.exit(1);
  }

  if (result.error) {
    console.error("Axiom API error:", JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // Save raw logs to a file for easy access later
  const logsDir = join(require("os").homedir(), ".claude", "debug");
  try { require("fs").mkdirSync(logsDir, { recursive: true }); } catch {}
  const rawLogsPath = join(logsDir, `axiom-logs-${Date.now()}.json`);
  writeFileSync(rawLogsPath, JSON.stringify(result, null, 2), "utf-8");
  result.rawLogsPath = rawLogsPath;

  // Output as JSON
  console.log(JSON.stringify(result, null, 2));
}

main();
