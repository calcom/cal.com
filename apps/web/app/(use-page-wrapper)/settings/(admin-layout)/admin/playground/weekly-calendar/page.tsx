"use client";

import { useState } from "react";

import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { CalendarEvent } from "@calcom/features/calendars/weeklyview/types/events";
import type { CalendarComponentProps, Hours } from "@calcom/features/calendars/weeklyview/types/state";

const makeDate = (dayOffset: number, hour: number, minute: number = 0) => {
  return dayjs("2025-01-06").add(dayOffset, "day").hour(hour).minute(minute).second(0).toDate();
};

const getBaseProps = ({
  events,
  startHour = 6,
}: {
  events: CalendarEvent[];
  startHour?: Hours;
}): CalendarComponentProps => ({
  startDate: dayjs("2025-01-06").toDate(), // Monday
  endDate: dayjs("2025-01-12").toDate(), // Sunday
  events,
  startHour,
  endHour: 18,
  gridCellsPerHour: 4,
  timezone: "UTC",
  showBackgroundPattern: false,
  showBorder: false,
  hideHeader: true,
  borderColor: "subtle",
  scrollToCurrentTime: false,
});

type Scenario = {
  id: string;
  title: string;
  description: string;
  expected: string;
  events: CalendarEvent[];
  startHour: Hours;
};

const scenarios: Scenario[] = [
  {
    id: "two-overlapping",
    title: "Two Overlapping Events",
    description: "Two events with overlapping time ranges on the same day",
    expected:
      "First event 80% width at left edge (0%), second event 50% width aligned to right edge (49.5% offset). Events spread across full width for maximum visual distinction. Hover should bring event to front.",
    startHour: 9,
    events: [
      {
        id: 1,
        title: "Meeting A",
        start: makeDate(0, 10, 0),
        end: makeDate(0, 11, 0),
        options: { status: "ACCEPTED", color: "#3b82f6" },
      },
      {
        id: 2,
        title: "Meeting B",
        start: makeDate(0, 10, 30),
        end: makeDate(0, 11, 30),
        options: { status: "ACCEPTED", color: "#10b981" },
      },
    ],
  },
  {
    id: "three-cascading",
    title: "Three Overlapping Events (Cascading)",
    description: "Three events that overlap, creating a cascading effect",
    expected:
      "Events spread across full width with variable widths (55%, ~42%, 33%). Offsets: 0%, ~35%, 66.5% (last event aligned to right edge). Right edges evenly distributed for maximum scatter. Z-index should increment. Hover brings any to top.",
    startHour: 9,
    events: [
      {
        id: 3,
        title: "Long Meeting",
        start: makeDate(1, 10, 0),
        end: makeDate(1, 12, 0),
        options: { status: "ACCEPTED", color: "#3b82f6" },
      },
      {
        id: 4,
        title: "Mid Meeting",
        start: makeDate(1, 10, 30),
        end: makeDate(1, 11, 30),
        options: { status: "PENDING", color: "#f59e0b" },
      },
      {
        id: 5,
        title: "Late Meeting",
        start: makeDate(1, 11, 0),
        end: makeDate(1, 12, 30),
        options: { status: "ACCEPTED", color: "#10b981" },
      },
    ],
  },
  {
    id: "non-overlapping",
    title: "Non-Overlapping Events",
    description: "Events that don't overlap should not cascade",
    expected: "Both events at 0% offset (separate groups), no cascade. Both should be 100% width.",
    startHour: 9,
    events: [
      {
        id: 6,
        title: "Morning Meeting",
        start: makeDate(2, 10, 0),
        end: makeDate(2, 11, 0),
        options: { status: "ACCEPTED", color: "#3b82f6" },
      },
      {
        id: 7,
        title: "Afternoon Meeting",
        start: makeDate(2, 12, 0),
        end: makeDate(2, 13, 0),
        options: { status: "ACCEPTED", color: "#10b981" },
      },
    ],
  },
  {
    id: "same-start-time",
    title: "Same Start Time, Different Durations",
    description: "Multiple events starting at the same time with varying lengths",
    expected:
      "Longest event first (base of cascade), spread across full width with variable widths (55%, ~42%, 33%). Last event aligned to right edge. All start at 10:00.",
    startHour: 9,
    events: [
      {
        id: 8,
        title: "2-Hour Meeting",
        start: makeDate(3, 10, 0),
        end: makeDate(3, 12, 0),
        options: { status: "ACCEPTED", color: "#3b82f6" },
      },
      {
        id: 9,
        title: "1.5-Hour Meeting",
        start: makeDate(3, 10, 0),
        end: makeDate(3, 11, 30),
        options: { status: "ACCEPTED", color: "#f59e0b" },
      },
      {
        id: 10,
        title: "30-Min Meeting",
        start: makeDate(3, 10, 0),
        end: makeDate(3, 10, 30),
        options: { status: "PENDING", color: "#10b981" },
      },
    ],
  },
  {
    id: "four-overlapping",
    title: "Four Overlapping Events",
    description: "Four events that overlap simultaneously",
    expected:
      "Events spread across full width with variable widths (40%, ~33%, ~28%, 25%). Last event aligned to right edge. Right edges evenly distributed for maximum scatter.",
    startHour: 9,
    events: [
      {
        id: 11,
        title: "Event A",
        start: makeDate(4, 10, 0),
        end: makeDate(4, 12, 0),
        options: { status: "ACCEPTED", color: "#3b82f6" },
      },
      {
        id: 12,
        title: "Event B",
        start: makeDate(4, 10, 30),
        end: makeDate(4, 11, 30),
        options: { status: "ACCEPTED", color: "#f59e0b" },
      },
      {
        id: 13,
        title: "Event C",
        start: makeDate(4, 11, 0),
        end: makeDate(4, 12, 30),
        options: { status: "ACCEPTED", color: "#10b981" },
      },
      {
        id: 50,
        title: "Event D",
        start: makeDate(4, 11, 15),
        end: makeDate(4, 12, 15),
        options: { status: "PENDING", color: "#8b5cf6" },
      },
    ],
  },
  {
    id: "dense-day",
    title: "Dense Day (20+ Events)",
    description: "A very busy day with many overlapping events",
    expected:
      "Visually tight stack with multiple cascading levels. Right edge should not overflow. Hover should still work.",
    startHour: 8,
    events: [
      {
        id: 14,
        title: "Team Standup",
        start: makeDate(5, 9, 0),
        end: makeDate(5, 9, 30),
        options: { status: "ACCEPTED", color: "#3b82f6" },
      },
      {
        id: 15,
        title: "Client Call",
        start: makeDate(5, 9, 15),
        end: makeDate(5, 10, 0),
        options: { status: "ACCEPTED", color: "#10b981" },
      },
      {
        id: 16,
        title: "Design Review",
        start: makeDate(5, 9, 45),
        end: makeDate(5, 11, 0),
        options: { status: "PENDING", color: "#f59e0b" },
      },
      {
        id: 17,
        title: "1-on-1",
        start: makeDate(5, 10, 0),
        end: makeDate(5, 10, 30),
        options: { status: "ACCEPTED", color: "#8b5cf6" },
      },
      {
        id: 18,
        title: "Planning",
        start: makeDate(5, 10, 15),
        end: makeDate(5, 11, 30),
        options: { status: "ACCEPTED", color: "#ec4899" },
      },
      {
        id: 19,
        title: "Code Review",
        start: makeDate(5, 11, 0),
        end: makeDate(5, 12, 0),
        options: { status: "ACCEPTED", color: "#14b8a6" },
      },
      {
        id: 20,
        title: "Lunch Meeting",
        start: makeDate(5, 11, 30),
        end: makeDate(5, 12, 30),
        options: { status: "ACCEPTED", color: "#f97316" },
      },
      {
        id: 21,
        title: "Workshop",
        start: makeDate(5, 12, 0),
        end: makeDate(5, 13, 30),
        options: { status: "ACCEPTED", color: "#06b6d4" },
      },
      {
        id: 22,
        title: "Interview",
        start: makeDate(5, 12, 30),
        end: makeDate(5, 13, 0),
        options: { status: "PENDING", color: "#84cc16" },
      },
      {
        id: 23,
        title: "Retrospective",
        start: makeDate(5, 13, 0),
        end: makeDate(5, 14, 0),
        options: { status: "ACCEPTED", color: "#a855f7" },
      },
      {
        id: 24,
        title: "Demo",
        start: makeDate(5, 13, 15),
        end: makeDate(5, 14, 0),
        options: { status: "CANCELLED", color: "#ef4444" },
      },
      {
        id: 30,
        title: "Quick Sync",
        start: makeDate(5, 9, 10),
        end: makeDate(5, 9, 40),
        options: { status: "ACCEPTED", color: "#6366f1" },
      },
      {
        id: 31,
        title: "Architecture Discussion",
        start: makeDate(5, 9, 30),
        end: makeDate(5, 10, 30),
        options: { status: "ACCEPTED", color: "#ec4899" },
      },
      {
        id: 32,
        title: "Sprint Planning",
        start: makeDate(5, 10, 10),
        end: makeDate(5, 11, 0),
        options: { status: "ACCEPTED", color: "#f59e0b" },
      },
      {
        id: 33,
        title: "Product Demo",
        start: makeDate(5, 10, 45),
        end: makeDate(5, 11, 45),
        options: { status: "PENDING", color: "#14b8a6" },
      },
      {
        id: 34,
        title: "Bug Triage",
        start: makeDate(5, 11, 15),
        end: makeDate(5, 12, 15),
        options: { status: "ACCEPTED", color: "#8b5cf6" },
      },
      {
        id: 35,
        title: "Customer Feedback",
        start: makeDate(5, 11, 45),
        end: makeDate(5, 12, 45),
        options: { status: "ACCEPTED", color: "#10b981" },
      },
      {
        id: 36,
        title: "Team Sync",
        start: makeDate(5, 12, 15),
        end: makeDate(5, 13, 15),
        options: { status: "ACCEPTED", color: "#3b82f6" },
      },
      {
        id: 37,
        title: "Tech Talk",
        start: makeDate(5, 12, 45),
        end: makeDate(5, 13, 45),
        options: { status: "ACCEPTED", color: "#f97316" },
      },
      {
        id: 38,
        title: "Standup Follow-up",
        start: makeDate(5, 13, 30),
        end: makeDate(5, 14, 0),
        options: { status: "ACCEPTED", color: "#06b6d4" },
      },
      {
        id: 39,
        title: "Office Hours",
        start: makeDate(5, 13, 45),
        end: makeDate(5, 14, 30),
        options: { status: "ACCEPTED", color: "#a855f7" },
      },
    ],
  },
  {
    id: "touching-events",
    title: "Touching Events (Edge Case)",
    description: "Events that touch exactly at boundaries",
    expected:
      "Separate groups; no cascade; both at 0% offset. Both should be 100% width. Events touching at 11:00 should not overlap.",
    startHour: 9,
    events: [
      {
        id: 25,
        title: "Morning Block",
        start: makeDate(6, 10, 0),
        end: makeDate(6, 11, 0),
        options: { status: "ACCEPTED", color: "#3b82f6" },
      },
      {
        id: 26,
        title: "Afternoon Block",
        start: makeDate(6, 11, 0),
        end: makeDate(6, 12, 0),
        options: { status: "ACCEPTED", color: "#10b981" },
      },
    ],
  },
  {
    id: "mixed-statuses",
    title: "Mixed Event Statuses",
    description: "Events with different booking statuses",
    expected:
      "Visual styling should differ by status (ACCEPTED, PENDING, CANCELLED). Cascade should still work.",
    startHour: 13,
    events: [
      {
        id: 27,
        title: "Confirmed Meeting",
        start: makeDate(0, 14, 0),
        end: makeDate(0, 15, 0),
        options: { status: "ACCEPTED", color: "#3b82f6" },
      },
      {
        id: 28,
        title: "Pending Approval",
        start: makeDate(0, 14, 30),
        end: makeDate(0, 15, 30),
        options: { status: "PENDING", color: "#f59e0b" },
      },
      {
        id: 29,
        title: "Cancelled Meeting",
        start: makeDate(0, 15, 0),
        end: makeDate(0, 16, 0),
        options: { status: "CANCELLED", color: "#ef4444" },
      },
    ],
  },
  {
    id: "event-durations",
    title: "Event Duration Layout Tests",
    description: "Events with different durations to test layout logic (eventDuration > 30 changes flex-col)",
    expected:
      "Events ≤30min show horizontal layout (title and time inline). Events >30min show vertical layout (title and time stacked).",
    startHour: 8,
    events: [
      {
        id: 40,
        title: "3min Quick Chat",
        start: makeDate(0, 9, 0),
        end: makeDate(0, 9, 3),
        options: { status: "ACCEPTED", color: "#3b82f6" },
      },
      {
        id: 41,
        title: "7min Standup",
        start: makeDate(0, 9, 15),
        end: makeDate(0, 9, 22),
        options: { status: "ACCEPTED", color: "#10b981" },
      },
      {
        id: 42,
        title: "15min Check-in",
        start: makeDate(0, 9, 30),
        end: makeDate(0, 9, 45),
        options: { status: "PENDING", color: "#f59e0b" },
      },
      {
        id: 43,
        title: "20min Review",
        start: makeDate(0, 10, 0),
        end: makeDate(0, 10, 20),
        options: { status: "ACCEPTED", color: "#8b5cf6" },
      },
      {
        id: 44,
        title: "30min Discussion",
        start: makeDate(0, 10, 30),
        end: makeDate(0, 11, 0),
        options: { status: "ACCEPTED", color: "#ec4899" },
      },
      {
        id: 45,
        title: "32min Discussion",
        start: makeDate(0, 11, 10),
        end: makeDate(0, 11, 42),
        options: { status: "ACCEPTED", color: "#ec4899" },
      },
      {
        id: 46,
        title: "40min Discussion",
        start: makeDate(0, 12, 0),
        end: makeDate(0, 12, 40),
        options: { status: "ACCEPTED", color: "#ec4899" },
      },
      {
        id: 47,
        title: "53min Workshop",
        description: "Learn about the latest trends in web development",
        start: makeDate(0, 13, 0),
        end: makeDate(0, 13, 53),
        options: { status: "ACCEPTED", color: "#14b8a6" },
      },
      {
        id: 48,
        title: "90min Workshop",
        description: "Learn about the latest trends in web development",
        start: makeDate(0, 14, 0),
        end: makeDate(0, 15, 30),
        options: { status: "ACCEPTED", color: "#14b8a6" },
      },
    ],
  },
];

function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const [showData, setShowData] = useState(false);

  return (
    <div className="border-subtle rounded-lg border p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{scenario.title}</h3>
        <p className="text-subtle mt-1 text-sm">{scenario.description}</p>
        <div className="bg-subtle mt-2 rounded p-2 text-xs">
          <strong>Expected:</strong> {scenario.expected}
        </div>
      </div>

      <div className="h-[600px] overflow-hidden rounded border">
        <Calendar {...getBaseProps({ events: scenario.events, startHour: scenario.startHour })} />
      </div>

      <button
        onClick={() => setShowData(!showData)}
        className="text-emphasis mt-2 text-sm underline hover:no-underline">
        {showData ? "Hide" : "Show"} Event Data
      </button>

      {showData && (
        <pre className="bg-subtle mt-2 overflow-auto rounded p-2 text-xs">
          {JSON.stringify(scenario.events, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function WeeklyCalendarPlayground() {
  return (
    <div className="stack-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Weekly Calendar Playground</h1>
        <p className="text-subtle mt-2">
          Test the overlapping events cascading layout with various scenarios. Events should cascade with 80%
          width and 8% left offset per overlap level. Hovering an event should bring it to the front.
        </p>
      </div>

      {/* Grid View of All Scenarios */}
      <div className="stack-y-8">
        <h2 className="mb-4 text-2xl font-bold">All Scenarios (Side-by-Side)</h2>
        {scenarios.map((scenario, index) => (
          <ScenarioCard key={index} scenario={scenario} />
        ))}
      </div>

      {/* Testing Checklist */}
      <div className="border-subtle rounded-lg border p-6">
        <h2 className="mb-4 text-xl font-bold">Testing Checklist</h2>
        <ul className="text-subtle stack-y-2 text-sm">
          <li>✓ Visual appearance matches expectations (80% width with 8% cascading offsets)</li>
          <li>✓ Hover behavior works smoothly - hovered event appears topmost</li>
          <li>✓ No visual glitches with 3+ overlapping events</li>
          <li>✓ Performance is acceptable with dense event days (10+ events)</li>
          <li>✓ Edge case: Events with identical start times render correctly</li>
          <li>✓ Edge case: Events that touch exactly (end = next start) don&apos;t incorrectly overlap</li>
          <li>✓ Different booking statuses (ACCEPTED, PENDING, CANCELLED) display correctly</li>
          <li>✓ Color bars on the left side of events display correctly</li>
        </ul>
      </div>
    </div>
  );
}
