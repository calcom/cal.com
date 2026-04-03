import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SchedulingType } from "@calcom/prisma/enums";

import { useAssignAllManagedWarning } from "../use-assign-all-managed-warning";

const MANAGED_OFF_TO_ON = {
  schedulingType: SchedulingType.MANAGED,
  oldAssignAllTeamMembers: false,
  newAssignAllTeamMembers: true,
} as const;

describe("useAssignAllManagedWarning", () => {
  it("returns true for MANAGED toggle OFF→ON", () => {
    const { result } = renderHook(() => useAssignAllManagedWarning());

    expect(result.current.shouldShowWarning(MANAGED_OFF_TO_ON)).toBe(true);
  });

  it("returns false for non-MANAGED scheduling types", () => {
    const { result } = renderHook(() => useAssignAllManagedWarning());

    expect(
      result.current.shouldShowWarning({
        schedulingType: SchedulingType.ROUND_ROBIN,
        oldAssignAllTeamMembers: false,
        newAssignAllTeamMembers: true,
      })
    ).toBe(false);
  });

  it("returns false when toggle is not OFF→ON", () => {
    const { result } = renderHook(() => useAssignAllManagedWarning());

    expect(
      result.current.shouldShowWarning({
        schedulingType: SchedulingType.MANAGED,
        oldAssignAllTeamMembers: true,
        newAssignAllTeamMembers: true,
      })
    ).toBe(false);

    expect(
      result.current.shouldShowWarning({
        schedulingType: SchedulingType.MANAGED,
        oldAssignAllTeamMembers: true,
        newAssignAllTeamMembers: false,
      })
    ).toBe(false);
  });

  it("show() opens the dialog", () => {
    const { result } = renderHook(() => useAssignAllManagedWarning());

    act(() => {
      result.current.show();
    });
    expect(result.current.isOpen).toBe(true);
  });

  it("confirm closes dialog", () => {
    const { result } = renderHook(() => useAssignAllManagedWarning());

    act(() => {
      result.current.show();
    });
    act(() => {
      result.current.confirm();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("cancel closes dialog", () => {
    const { result } = renderHook(() => useAssignAllManagedWarning());

    act(() => {
      result.current.show();
    });
    act(() => {
      result.current.cancel();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("returns false after confirm (same session)", () => {
    const { result } = renderHook(() => useAssignAllManagedWarning());

    act(() => {
      result.current.show();
    });
    act(() => {
      result.current.confirm();
    });

    expect(result.current.shouldShowWarning(MANAGED_OFF_TO_ON)).toBe(false);
  });

  it("returns true again after cancel (user may retry)", () => {
    const { result } = renderHook(() => useAssignAllManagedWarning());

    act(() => {
      result.current.show();
    });
    act(() => {
      result.current.cancel();
    });

    expect(result.current.shouldShowWarning(MANAGED_OFF_TO_ON)).toBe(true);
  });
});
