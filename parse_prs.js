const fs = require("fs");

const data = JSON.parse(fs.readFileSync("C:\\Users\\hp\\AppData\\Local\\Temp\\prs.json", "utf8"));

// Current date
const now = new Date("2026-04-01T23:38:00Z");
// 7 days ago
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

const isAtLeastOneWeekOld = (dateStr) => {
  const d = new Date(dateStr);
  return d <= oneWeekAgo;
};

// Filter open PRs that are at least 1 week old
const olderPrs = data.filter((pr) => isAtLeastOneWeekOld(pr.createdAt));

// Sort by "hardness" - let's use the sum of additions + deletions + (changedFiles * 10)
olderPrs.sort((a, b) => {
  const scoreA = a.additions + a.deletions + a.changedFiles * 10;
  const scoreB = b.additions + b.deletions + b.changedFiles * 10;
  return scoreB - scoreA;
});

const top3 = olderPrs.slice(0, 3);

console.log(JSON.stringify(top3, null, 2));
