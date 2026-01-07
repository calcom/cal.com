"use client";

import { useState } from "react";

import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";

import { processAllProrations, triggerProrationForTeam } from "../actions";

export function TriggerProrationForm() {
  const [teamId, setTeamId] = useState("");
  const [monthKey, setMonthKey] = useState(() => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
  const [loading, setLoading] = useState(false);

  const handleTriggerSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await triggerProrationForTeam(parseInt(teamId), monthKey);

      if (result.success) {
        showToast(result.message, "success");
        setTeamId("");
      } else {
        showToast(result.message, "error");
      }
    } catch (error) {
      showToast("Failed to trigger proration", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessAll = async () => {
    setLoading(true);

    try {
      const result = await processAllProrations(monthKey);

      if (result.success) {
        showToast(result.message, "success");
      } else {
        showToast(result.message, "error");
      }
    } catch (error) {
      showToast("Failed to process prorations", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-default border-subtle space-y-4 rounded-lg border p-6">
      <h3 className="text-emphasis text-lg font-semibold">Trigger Proration (Admin)</h3>

      <form onSubmit={handleTriggerSingle} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="teamId" className="text-default mb-2 block text-sm font-medium">
              Team ID
            </label>
            <input
              type="number"
              id="teamId"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="border-default bg-default text-default focus:border-emphasis block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1"
              placeholder="Enter team ID"
              required
            />
          </div>

          <div>
            <label htmlFor="monthKey" className="text-default mb-2 block text-sm font-medium">
              Month (YYYY-MM)
            </label>
            <input
              type="text"
              id="monthKey"
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              className="border-default bg-default text-default focus:border-emphasis block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1"
              placeholder="2026-01"
              pattern="\d{4}-\d{2}"
              required
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Processing..." : "Trigger for Team"}
          </Button>
          <Button type="button" color="secondary" onClick={handleProcessAll} disabled={loading}>
            {loading ? "Processing..." : "Process All Teams"}
          </Button>
        </div>
      </form>

      <p className="text-subtle text-sm">
        This will immediately process proration for the selected team/month instead of waiting for the monthly
        cron job.
      </p>
    </div>
  );
}
