import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  EventAvailabilityTab,
  type HostSchedulesQueryType,
} from "@calcom/features/eventtypes/components/tabs/availability/EventAvailabilityTab";
import type { EventTypeSetup, FormValues, Host } from "@calcom/features/eventtypes/lib/types";
import { SchedulingType } from "@calcom/prisma/enums";

vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

let visibleIndexes = [0, 1];

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getVirtualItems: () =>
      visibleIndexes.map((index) => ({
        index,
        start: index * 88,
      })),
    getTotalSize: () => 88 * 100,
    measureElement: vi.fn(),
  }),
}));

vi.mock("@calcom/ui/components/form", async () => {
  const actual = await vi.importActual<typeof import("@calcom/ui/components/form")>("@calcom/ui/components/form");

  return {
    ...actual,
    Select: ({
      options,
      value,
      onChange,
    }: {
      options?: { label: string; value: number }[];
      value?: { label: string; value: number } | null;
      onChange?: (value: { label: string; value: number } | null) => void;
    }) => (
      <select
        data-testid="host-schedule-select"
        value={value?.value ?? ""}
        onChange={(event) => {
          const selectedOption =
            options?.find((option) => String(option.value) === event.target.value) ?? null;
          onChange?.(selectedOption);
        }}>
        <option value="">select</option>
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
  };
});

const buildHost = (index: number, scheduleId?: number | null): Host => ({
  isFixed: false,
  userId: index + 1,
  priority: 2,
  weight: 100,
  scheduleId,
  groupId: null,
  name: `Host ${index + 1}`,
  avatar: `https://example.com/avatar-${index + 1}.png`,
});

const buildEventType = (overrides: Partial<EventTypeSetup> = {}): EventTypeSetup =>
  ({
    schedule: null,
    restrictionScheduleId: null,
    schedulingType: SchedulingType.ROUND_ROBIN,
    ...overrides,
  }) as EventTypeSetup;

const buildScheduleQueryResult = (schedules: { id: number; name: string; isDefault: boolean; userId: number }[]) =>
  ({
    data: {
      schedules: schedules.map((schedule) => ({
        ...schedule,
        readOnly: false,
      })),
    },
    isPending: false,
  }) as unknown as UseQueryResult<
    | {
        schedules: {
          id: number;
          name: string;
          isDefault: boolean;
          userId: number;
          readOnly: boolean;
        }[];
      }
    | undefined,
    unknown
  >;

let capturedForm: UseFormReturn<FormValues> | null = null;

const renderAvailabilityTab = ({
  hosts,
  hostSchedulesQuery,
}: {
  hosts: Host[];
  hostSchedulesQuery: HostSchedulesQueryType;
}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const methods = useForm<FormValues>({
      defaultValues: {
        hosts,
        schedule: null,
        restrictionScheduleId: null,
        useBookerTimezone: false,
      },
    });

    capturedForm = methods;

    return <FormProvider {...methods}>{children}</FormProvider>;
  };

  return render(
    <EventAvailabilityTab
      eventType={buildEventType()}
      isTeamEvent={true}
      hostSchedulesQuery={hostSchedulesQuery}
      isRestrictionScheduleEnabled={false}
    />,
    { wrapper: Wrapper }
  );
};

describe("EventAvailabilityTab", () => {
  beforeEach(() => {
    visibleIndexes = [0, 1];
    capturedForm = null;
  });

  it("updates the selected host schedule in form state", async () => {
    const hosts = [buildHost(0, 101), buildHost(1, 201)];
    const hostSchedulesQuery = vi.fn(({ userId }: { userId: number }) => {
      if (userId === 1) {
        return buildScheduleQueryResult([
          { id: 101, name: "Default Schedule", isDefault: true, userId },
          { id: 102, name: "Custom Schedule", isDefault: false, userId },
        ]);
      }

      return buildScheduleQueryResult([{ id: 201, name: "Host 2 Default", isDefault: true, userId }]);
    }) as HostSchedulesQueryType;

    renderAvailabilityTab({ hosts, hostSchedulesQuery });

    const hostRow = screen.getByText("Host 1").closest("li");
    expect(hostRow).toBeInTheDocument();

    const select = within(hostRow as HTMLElement).getByTestId("host-schedule-select");
    fireEvent.change(select, { target: { value: "102" } });

    await waitFor(() => {
      expect(capturedForm?.getValues("hosts.0.scheduleId")).toBe(102);
    });

    expect(capturedForm?.getValues("hosts.1.scheduleId")).toBe(201);
  });

  it("does not overwrite schedules for hosts whose rows have not been loaded yet", async () => {
    const hosts = Array.from({ length: 30 }, (_, index) => buildHost(index, (index + 1) * 100 + 1));
    const hiddenHostUserId = 30;
    const hiddenHostScheduleId = 3001;

    hosts[hiddenHostUserId - 1] = buildHost(hiddenHostUserId - 1, hiddenHostScheduleId);

    const hostSchedulesQuery = vi.fn(({ userId }: { userId: number }) => {
      if (userId === 1) {
        return buildScheduleQueryResult([
          { id: 101, name: "Default Schedule", isDefault: true, userId },
          { id: 102, name: "Custom Schedule", isDefault: false, userId },
        ]);
      }

      if (userId === hiddenHostUserId) {
        return buildScheduleQueryResult([
          { id: 3000, name: "Later Default", isDefault: true, userId },
          { id: hiddenHostScheduleId, name: "Saved Schedule", isDefault: false, userId },
        ]);
      }

      return buildScheduleQueryResult([{ id: userId * 100 + 1, name: `Schedule ${userId}`, isDefault: true, userId }]);
    }) as HostSchedulesQueryType;

    const rendered = renderAvailabilityTab({ hosts, hostSchedulesQuery });

    const hostOneRow = screen.getByText("Host 1").closest("li");
    expect(hostOneRow).toBeInTheDocument();

    fireEvent.change(within(hostOneRow as HTMLElement).getByTestId("host-schedule-select"), {
      target: { value: "102" },
    });

    await waitFor(() => {
      expect(capturedForm?.getValues("hosts.0.scheduleId")).toBe(102);
    });

    expect(capturedForm?.getValues(`hosts.${hiddenHostUserId - 1}.scheduleId`)).toBe(hiddenHostScheduleId);

    const queriedUserIdsBeforeReveal = new Set(
      vi.mocked(hostSchedulesQuery).mock.calls.map(([input]: [{ userId: number }]) => input.userId)
    );
    expect(queriedUserIdsBeforeReveal.has(hiddenHostUserId)).toBe(false);

    visibleIndexes = [hiddenHostUserId - 1];
    rendered.rerender(
      <EventAvailabilityTab
        eventType={buildEventType()}
        isTeamEvent={true}
        hostSchedulesQuery={hostSchedulesQuery}
        isRestrictionScheduleEnabled={false}
      />
    );

    const hiddenHostRow = await screen.findByText(`Host ${hiddenHostUserId}`);
    const hiddenHostSelect = within(hiddenHostRow.closest("li") as HTMLElement).getByTestId("host-schedule-select");

    await waitFor(() => {
      expect(hiddenHostSelect).toHaveValue(String(hiddenHostScheduleId));
    });

    expect(capturedForm?.getValues(`hosts.${hiddenHostUserId - 1}.scheduleId`)).toBe(hiddenHostScheduleId);

    const queriedUserIdsAfterReveal = new Set(
      vi.mocked(hostSchedulesQuery).mock.calls.map(([input]: [{ userId: number }]) => input.userId)
    );
    expect(queriedUserIdsAfterReveal.has(hiddenHostUserId)).toBe(true);
  });
});
