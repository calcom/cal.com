import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SchedulingType } from "@calcom/prisma/enums";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";

import { useManagedEventConflictCheck } from "../use-managed-event-conflict-check";

function makeChild({
  id,
  name,
  created,
  eventTypeSlugs,
}: {
  id: number;
  name: string;
  created: boolean;
  eventTypeSlugs: string[];
}) {
  return {
    value: String(id),
    label: name,
    created,
    owner: {
      avatar: "",
      id,
      email: `${name.toLowerCase()}@example.com`,
      name,
      username: name.toLowerCase(),
      membership: "MEMBER" as const,
      eventTypeSlugs,
      profile: {} as FormValues["children"][number]["owner"]["profile"],
    },
    slug: "consultation",
    hidden: false,
  };
}

function makeFormValues(overrides: Partial<FormValues> = {}): FormValues {
  return {
    slug: "consultation",
    children: [],
    ...overrides,
  } as FormValues;
}

describe("useManagedEventConflictCheck", () => {
  it("calls onSubmit directly when there are no conflicts", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useManagedEventConflictCheck({ schedulingType: SchedulingType.MANAGED, onSubmit })
    );

    const values = makeFormValues({
      children: [makeChild({ id: 1, name: "Alice", created: false, eventTypeSlugs: ["other-slug"] })],
    });

    act(() => {
      result.current.handleSubmit(values);
    });

    expect(onSubmit).toHaveBeenCalledWith(values);
    expect(result.current.conflictDialog.conflictingChildren).toHaveLength(0);
  });

  it("intercepts submit when new children have conflicting slugs", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useManagedEventConflictCheck({ schedulingType: SchedulingType.MANAGED, onSubmit })
    );

    const conflicting = makeChild({ id: 1, name: "Alice", created: false, eventTypeSlugs: ["consultation"] });
    const values = makeFormValues({ children: [conflicting] });

    act(() => {
      result.current.handleSubmit(values);
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.conflictDialog.conflictingChildren).toEqual([conflicting]);
  });

  it("does not flag already-created children as conflicts", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useManagedEventConflictCheck({ schedulingType: SchedulingType.MANAGED, onSubmit })
    );

    const values = makeFormValues({
      children: [makeChild({ id: 1, name: "Alice", created: true, eventTypeSlugs: ["consultation"] })],
    });

    act(() => {
      result.current.handleSubmit(values);
    });

    expect(onSubmit).toHaveBeenCalledWith(values);
    expect(result.current.conflictDialog.conflictingChildren).toHaveLength(0);
  });

  it("skips conflict check for non-MANAGED scheduling types", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useManagedEventConflictCheck({ schedulingType: SchedulingType.ROUND_ROBIN, onSubmit })
    );

    const values = makeFormValues({
      children: [makeChild({ id: 1, name: "Alice", created: false, eventTypeSlugs: ["consultation"] })],
    });

    act(() => {
      result.current.handleSubmit(values);
    });

    expect(onSubmit).toHaveBeenCalledWith(values);
  });

  it("confirm() submits stored values and closes dialog", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useManagedEventConflictCheck({ schedulingType: SchedulingType.MANAGED, onSubmit })
    );

    const values = makeFormValues({
      children: [makeChild({ id: 1, name: "Alice", created: false, eventTypeSlugs: ["consultation"] })],
    });

    act(() => {
      result.current.handleSubmit(values);
    });
    expect(onSubmit).not.toHaveBeenCalled();

    act(() => {
      result.current.conflictDialog.confirm();
    });

    expect(onSubmit).toHaveBeenCalledWith(values);
    expect(result.current.conflictDialog.conflictingChildren).toHaveLength(0);
  });

  it("cancel() clears state without submitting", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useManagedEventConflictCheck({ schedulingType: SchedulingType.MANAGED, onSubmit })
    );

    const values = makeFormValues({
      children: [makeChild({ id: 1, name: "Alice", created: false, eventTypeSlugs: ["consultation"] })],
    });

    act(() => {
      result.current.handleSubmit(values);
    });

    act(() => {
      result.current.conflictDialog.cancel();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.conflictDialog.conflictingChildren).toHaveLength(0);
  });

  it("only flags new children with matching slugs, not all children", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useManagedEventConflictCheck({ schedulingType: SchedulingType.MANAGED, onSubmit })
    );

    const conflicting = makeChild({ id: 1, name: "Alice", created: false, eventTypeSlugs: ["consultation"] });
    const noConflict = makeChild({ id: 2, name: "Bob", created: false, eventTypeSlugs: ["other"] });
    const existing = makeChild({ id: 3, name: "Carol", created: true, eventTypeSlugs: ["consultation"] });
    const values = makeFormValues({ children: [conflicting, noConflict, existing] });

    act(() => {
      result.current.handleSubmit(values);
    });

    expect(result.current.conflictDialog.conflictingChildren).toEqual([conflicting]);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("passes through when schedulingType is null", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useManagedEventConflictCheck({ schedulingType: null, onSubmit })
    );

    const values = makeFormValues({
      children: [makeChild({ id: 1, name: "Alice", created: false, eventTypeSlugs: ["consultation"] })],
    });

    act(() => {
      result.current.handleSubmit(values);
    });

    expect(onSubmit).toHaveBeenCalledWith(values);
  });
});
