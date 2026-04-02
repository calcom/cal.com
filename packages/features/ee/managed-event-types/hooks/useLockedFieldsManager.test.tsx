/**
 * @vitest-environment jsdom
 */

import { SchedulingType } from "@calcom/prisma/enums";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useLockedFieldsManager from "./useLockedFieldsManager";

describe("useLockedFieldsManager", () => {
  const mockTranslate = vi.fn((key: string) => key);

  const createMockFormMethods = (getValuesReturn: unknown = undefined) => {
    const setValueMock = vi.fn();
    const getValuesMock = vi.fn().mockReturnValue(getValuesReturn);

    return {
      setValue: setValueMock,
      getValues: getValuesMock,
      watch: vi.fn(),
      register: vi.fn(),
      handleSubmit: vi.fn(),
      formState: { errors: {} },
      control: {},
    } as unknown as ReturnType<typeof import("react-hook-form").useForm>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isManagedEventType", () => {
    it("should return true when schedulingType is MANAGED", () => {
      const mockFormMethods = createMockFormMethods();
      const eventType = {
        schedulingType: SchedulingType.MANAGED,
        userId: 1,
        metadata: {},
        id: 1,
      };

      const { result } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      expect(result.current.isManagedEventType).toBe(true);
    });

    it("should return false when schedulingType is not MANAGED", () => {
      const mockFormMethods = createMockFormMethods();
      const eventType = {
        schedulingType: null,
        userId: 1,
        metadata: {},
        id: 1,
      };

      const { result } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      expect(result.current.isManagedEventType).toBe(false);
    });
  });

  describe("isChildrenManagedEventType", () => {
    it("should return true when metadata has managedEventConfig and schedulingType is not MANAGED", () => {
      const mockFormMethods = createMockFormMethods();
      const eventType = {
        schedulingType: null,
        userId: 1,
        metadata: {
          managedEventConfig: { unlockedFields: {} },
        },
        id: 1,
      };

      const { result } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      expect(result.current.isChildrenManagedEventType).toBe(true);
    });

    it("should return false when metadata has managedEventConfig but schedulingType is MANAGED", () => {
      const mockFormMethods = createMockFormMethods();
      const eventType = {
        schedulingType: SchedulingType.MANAGED,
        userId: 1,
        metadata: {
          managedEventConfig: { unlockedFields: {} },
        },
        id: 1,
      };

      const { result } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      expect(result.current.isChildrenManagedEventType).toBe(false);
    });

    it("should return false when metadata does not have managedEventConfig", () => {
      const mockFormMethods = createMockFormMethods();
      const eventType = {
        schedulingType: null,
        userId: 1,
        metadata: {},
        id: 1,
      };

      const { result } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      expect(result.current.isChildrenManagedEventType).toBe(false);
    });
  });

  describe("setUnlockedFields", () => {
    it("should initialize empty object when getValues returns undefined", () => {
      const mockFormMethods = createMockFormMethods(undefined);
      const eventType = {
        schedulingType: SchedulingType.MANAGED,
        userId: 1,
        metadata: {},
        id: 1,
      };

      const { result } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      const LockedSwitchComponent = result.current.useLockedSwitch("title");
      const rendered = LockedSwitchComponent();

      if (rendered?.props.onCheckedChange) {
        rendered.props.onCheckedChange(false);
      }

      expect(mockFormMethods.setValue).toHaveBeenCalledWith(
        "metadata.managedEventConfig.unlockedFields",
        { title: true },
        { shouldDirty: true }
      );
    });

    it("should handle delete on empty object when getValues returns undefined", () => {
      const mockFormMethods = createMockFormMethods(undefined);
      const eventType = {
        schedulingType: SchedulingType.MANAGED,
        userId: 1,
        metadata: {},
        id: 1,
      };

      const { result } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      const LockedSwitchComponent = result.current.useLockedSwitch("title");
      const rendered = LockedSwitchComponent();

      if (rendered?.props.onCheckedChange) {
        rendered.props.onCheckedChange(true);
      }

      expect(mockFormMethods.setValue).toHaveBeenCalledWith(
        "metadata.managedEventConfig.unlockedFields",
        {},
        { shouldDirty: true }
      );
    });

    it("should preserve existing fields when adding a new unlocked field", () => {
      const existingFields = { description: true };
      const mockFormMethods = createMockFormMethods(existingFields);
      const eventType = {
        schedulingType: SchedulingType.MANAGED,
        userId: 1,
        metadata: { managedEventConfig: { unlockedFields: existingFields } },
        id: 1,
      };

      const { result } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      const LockedSwitchComponent = result.current.useLockedSwitch("title");
      const rendered = LockedSwitchComponent();

      if (rendered?.props.onCheckedChange) {
        rendered.props.onCheckedChange(false);
      }

      expect(mockFormMethods.setValue).toHaveBeenCalledWith(
        "metadata.managedEventConfig.unlockedFields",
        { description: true, title: true },
        { shouldDirty: true }
      );
    });

    it("should remove field from existing unlockedFields when locking", () => {
      const existingFields = { title: true, description: true };
      const mockFormMethods = createMockFormMethods(existingFields);
      const eventType = {
        schedulingType: SchedulingType.MANAGED,
        userId: 1,
        metadata: { managedEventConfig: { unlockedFields: existingFields } },
        id: 1,
      };

      const { result } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      const LockedSwitchComponent = result.current.useLockedSwitch("title");
      const rendered = LockedSwitchComponent();

      if (rendered?.props.onCheckedChange) {
        rendered.props.onCheckedChange(true);
      }

      expect(mockFormMethods.setValue).toHaveBeenCalledWith(
        "metadata.managedEventConfig.unlockedFields",
        { description: true },
        { shouldDirty: true }
      );
    });
  });

  describe("useLockedSwitch", () => {
    it("should return a component for managed event type", () => {
      const mockFormMethods = createMockFormMethods();
      const eventType = {
        schedulingType: SchedulingType.MANAGED,
        userId: 1,
        metadata: {},
        id: 1,
      };

      const { result } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      const LockedSwitchComponent = result.current.useLockedSwitch("title");
      const rendered = LockedSwitchComponent();

      expect(rendered).not.toBeNull();
      expect(rendered?.props["data-testid"]).toBe("locked-indicator-title");
    });

    it("should return null for non-managed event type", () => {
      const mockFormMethods = createMockFormMethods();
      const eventType = {
        schedulingType: SchedulingType.ROUND_ROBIN,
        userId: 1,
        metadata: {},
        id: 1,
      };

      const { result } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      const LockedSwitchComponent = result.current.useLockedSwitch("title");
      const rendered = LockedSwitchComponent();

      expect(rendered).toBeNull();
    });
  });

  describe("shouldLockDisableProps", () => {
    it("should return isLocked=true for managed event type when field is not unlocked", () => {
      const mockFormMethods = createMockFormMethods({
        managedEventConfig: { unlockedFields: {} },
      });
      const eventType = {
        schedulingType: SchedulingType.MANAGED,
        userId: 1,
        metadata: { managedEventConfig: { unlockedFields: {} } },
        id: 1,
      };

      const { result, rerender } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      act(() => {
        result.current.shouldLockDisableProps("title");
      });
      rerender();

      const props = result.current.shouldLockDisableProps("title");
      expect(props.isLocked).toBe(true);
      expect(props.disabled).toBe(false);
    });

    it("should return isLocked=false for managed event type when field is unlocked", () => {
      const mockFormMethods = createMockFormMethods({
        managedEventConfig: { unlockedFields: { title: true } },
      });
      const eventType = {
        schedulingType: SchedulingType.MANAGED,
        userId: 1,
        metadata: { managedEventConfig: { unlockedFields: { title: true } } },
        id: 1,
      };

      const { result, rerender } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      act(() => {
        result.current.shouldLockDisableProps("title");
      });
      rerender();

      const props = result.current.shouldLockDisableProps("title");
      expect(props.isLocked).toBe(false);
    });

    it("should return disabled=true for children managed event type when field is locked", () => {
      const mockFormMethods = createMockFormMethods({
        managedEventConfig: { unlockedFields: {} },
      });
      const eventType = {
        schedulingType: null,
        userId: 1,
        metadata: { managedEventConfig: { unlockedFields: {} } },
        id: 1,
      };

      const { result, rerender } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      act(() => {
        result.current.shouldLockDisableProps("title");
      });
      rerender();

      const props = result.current.shouldLockDisableProps("title");
      expect(props.disabled).toBe(true);
      expect(props.isLocked).toBe(true);
    });

    it("should return disabled=false for children managed event type when field is unlocked", () => {
      const mockFormMethods = createMockFormMethods({
        managedEventConfig: { unlockedFields: { title: true } },
      });
      const eventType = {
        schedulingType: null,
        userId: 1,
        metadata: { managedEventConfig: { unlockedFields: { title: true } } },
        id: 1,
      };

      const { result, rerender } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      act(() => {
        result.current.shouldLockDisableProps("title");
      });
      rerender();

      const props = result.current.shouldLockDisableProps("title");
      expect(props.disabled).toBe(false);
      expect(props.isLocked).toBe(false);
    });
  });

  describe("useLockedLabel", () => {
    it("should return correct properties for managed event type", () => {
      const mockFormMethods = createMockFormMethods({
        managedEventConfig: { unlockedFields: {} },
      });
      const eventType = {
        schedulingType: SchedulingType.MANAGED,
        userId: 1,
        metadata: { managedEventConfig: { unlockedFields: {} } },
        id: 1,
      };

      const { result, rerender } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      act(() => {
        result.current.useLockedLabel("title");
      });
      rerender();

      const labelProps = result.current.useLockedLabel("title");
      expect(labelProps.isLocked).toBe(true);
      expect(labelProps.disabled).toBe(false);
      expect(labelProps.LockedIcon).toBeDefined();
    });

    it("should return disabled=true for children managed event type with locked field", () => {
      const mockFormMethods = createMockFormMethods({
        managedEventConfig: { unlockedFields: {} },
      });
      const eventType = {
        schedulingType: null,
        userId: 1,
        metadata: { managedEventConfig: { unlockedFields: {} } },
        id: 1,
      };

      const { result, rerender } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      act(() => {
        result.current.useLockedLabel("title");
      });
      rerender();

      const labelProps = result.current.useLockedLabel("title");
      expect(labelProps.disabled).toBe(true);
      expect(labelProps.isLocked).toBe(true);
    });
  });

  describe("shouldLockIndicator", () => {
    it("should return LockedIndicator for managed event type", () => {
      const mockFormMethods = createMockFormMethods({
        managedEventConfig: { unlockedFields: {} },
      });
      const eventType = {
        schedulingType: SchedulingType.MANAGED,
        userId: 1,
        metadata: { managedEventConfig: { unlockedFields: {} } },
        id: 1,
      };

      const { result } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      const indicator = result.current.shouldLockIndicator("title");
      expect(indicator).toBeTruthy();
    });

    it("should return LockedIndicator for children managed event type", () => {
      const mockFormMethods = createMockFormMethods({
        managedEventConfig: { unlockedFields: {} },
      });
      const eventType = {
        schedulingType: null,
        userId: 1,
        metadata: { managedEventConfig: { unlockedFields: {} } },
        id: 1,
      };

      const { result } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      const indicator = result.current.shouldLockIndicator("title");
      expect(indicator).toBeTruthy();
    });

    it("should return falsy for non-managed event type", () => {
      const mockFormMethods = createMockFormMethods();
      const eventType = {
        schedulingType: SchedulingType.ROUND_ROBIN,
        userId: 1,
        metadata: {},
        id: 1,
      };

      const { result } = renderHook(() =>
        useLockedFieldsManager({
          eventType,
          translate: mockTranslate,
          formMethods: mockFormMethods,
        })
      );

      const indicator = result.current.shouldLockIndicator("title");
      expect(indicator).toBeFalsy();
    });
  });
});
