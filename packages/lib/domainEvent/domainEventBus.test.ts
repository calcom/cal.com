import { afterEach, describe, expect, it, vi } from "vitest";

import type { DomainEvent, DomainEventListener } from "./domainEvent";
import { DomainEventBus } from "./domainEventBus";
import { onDomainEvent } from "./onDomainEvent";

/* eslint-disable @typescript-eslint/no-empty-function */

class TestDomainEvent implements DomainEvent {}

class AnotherDomainEvent implements DomainEvent {}

class TestListener implements DomainEventListener {
  @onDomainEvent(TestDomainEvent)
  onTestDomainEvent() {}

  @onDomainEvent(AnotherDomainEvent)
  onAnotherDomainEvent() {}

  @onDomainEvent(TestDomainEvent, { blocking: true })
  onTestDomainEventBlocking() {}

  @onDomainEvent(TestDomainEvent)
  onTestDomainEvent2() {}
}

describe("DomainEventBus", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("dispatch()", () => {
    it("should invoke a registered listener for an event", async () => {
      const domainEventBus = new DomainEventBus();
      const listener = new TestListener();
      domainEventBus.addListener(listener);

      vi.spyOn(listener, "onTestDomainEvent");

      const event = new TestDomainEvent();
      const timestamp = new Date();
      await domainEventBus.dispatch(event, timestamp);

      expect(listener.onTestDomainEvent).toHaveBeenCalledWith(event, timestamp);
    });

    it("should invoke multiple handlers registered for the same event", async () => {
      const domainEventBus = new DomainEventBus();
      const listener = new TestListener();
      domainEventBus.addListener(listener);

      vi.spyOn(listener, "onTestDomainEvent");
      vi.spyOn(listener, "onTestDomainEvent2");

      await domainEventBus.dispatch(new TestDomainEvent());

      expect(listener.onTestDomainEvent).toHaveBeenCalled();
      expect(listener.onTestDomainEvent2).toHaveBeenCalled();
    });

    it("should allow one method to handle multiple event types", async () => {
      class MultiEventListener implements DomainEventListener {
        handled: string[] = [];

        @onDomainEvent(TestDomainEvent)
        @onDomainEvent(AnotherDomainEvent)
        onAnyEvent(e: DomainEvent) {
          this.handled.push(e.constructor.name);
        }
      }

      const domainEventBus = new DomainEventBus();
      const listener = new MultiEventListener();
      domainEventBus.addListener(listener);

      await domainEventBus.dispatch(new TestDomainEvent());
      await domainEventBus.dispatch(new AnotherDomainEvent());

      expect(listener.handled).toEqual(["TestDomainEvent", "AnotherDomainEvent"]);
    });

    it("should wait for blocking handlers before non-blocking", async () => {
      const domainEventBus = new DomainEventBus();
      const listener = new TestListener();
      domainEventBus.addListener(listener);

      const logs: string[] = [];
      let resolveBlocking!: () => void;
      const blockingPromise = new Promise<void>((resolve) => {
        resolveBlocking = () => {
          logs.push("blocking resolved");
          resolve();
        };
      });
      vi.spyOn(listener, "onTestDomainEventBlocking").mockImplementation(() => {
        logs.push("blocking start");
        return blockingPromise;
      });
      vi.spyOn(listener, "onTestDomainEvent").mockImplementation(() => {
        logs.push("non-blocking start");
      });

      const dispatchPromise = domainEventBus.dispatch(new TestDomainEvent());

      await Promise.resolve(); // flush microtasks

      // Non-blocking should not run yet
      expect(logs).toEqual(["blocking start"]);

      resolveBlocking();
      await dispatchPromise;

      expect(logs).toEqual(["blocking start", "blocking resolved", "non-blocking start"]);
    });

    it("should do nothing if no handlers are registered for the event", async () => {
      const domainEventBus = new DomainEventBus();
      const event = new TestDomainEvent();
      await expect(domainEventBus.dispatch(event)).resolves.toBeUndefined();
    });
  });

  describe("addListener()", () => {
    it("should register listener instance correctly", async () => {
      const domainEventBus = new DomainEventBus();
      const listener = new TestListener();
      vi.spyOn(listener, "onTestDomainEvent");

      domainEventBus.addListener(listener);
      await domainEventBus.dispatch(new TestDomainEvent());

      expect(listener.onTestDomainEvent).toHaveBeenCalled();
    });

    it("should register listener class correctly", async () => {
      class TestListenerType implements DomainEventListener {
        static lastInstance: TestListenerType;
        constructor() {
          TestListenerType.lastInstance = this;
        }
        @onDomainEvent(TestDomainEvent)
        onTestDomainEvent() {}
      }

      const domainEventBus = new DomainEventBus();
      domainEventBus.addListener(TestListenerType);
      expect(TestListenerType.lastInstance).toBeDefined();

      vi.spyOn(TestListenerType.lastInstance, "onTestDomainEvent");

      await domainEventBus.dispatch(new TestDomainEvent());
      expect(TestListenerType.lastInstance.onTestDomainEvent).toHaveBeenCalled();
    });

    it("should not register the same listener twice", async () => {
      const domainEventBus = new DomainEventBus();
      const listener = new TestListener();
      vi.spyOn(listener, "onTestDomainEvent");

      domainEventBus.addListener(listener);
      domainEventBus.addListener(listener);

      await domainEventBus.dispatch(new TestDomainEvent());

      expect(listener.onTestDomainEvent).toHaveBeenCalledTimes(1);
    });

    it("should not register the same handler twice for the same event", async () => {
      class DuplicateHandlerListener implements DomainEventListener {
        calls = 0;

        @onDomainEvent(TestDomainEvent)
        @onDomainEvent(TestDomainEvent)
        onTest() {
          this.calls++;
        }
      }

      const domainEventBus = new DomainEventBus();
      const listener = new DuplicateHandlerListener();
      domainEventBus.addListener(listener);

      await domainEventBus.dispatch(new TestDomainEvent());
      expect(listener.calls).toBe(1);
    });
  });

  describe("addListeners()", () => {
    it("should register multiple listeners", async () => {
      class TestListener2 implements DomainEventListener {
        @onDomainEvent(TestDomainEvent)
        onTestDomainEvent() {}
      }

      const domainEventBus = new DomainEventBus();
      const listener = new TestListener();
      const listener2 = new TestListener2();
      vi.spyOn(listener, "onTestDomainEvent");
      vi.spyOn(listener2, "onTestDomainEvent");

      domainEventBus.addListeners([listener, listener2]);
      await domainEventBus.dispatch(new TestDomainEvent());

      expect(listener.onTestDomainEvent).toHaveBeenCalled();
      expect(listener2.onTestDomainEvent).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should continue processing events when handler throws", async () => {
      const domainEventBus = new DomainEventBus();
      const listener = new TestListener();
      vi.spyOn(listener, "onTestDomainEvent").mockImplementation(() => Promise.reject("Test error"));
      vi.spyOn(listener, "onTestDomainEvent2");

      domainEventBus.addListener(listener);
      await domainEventBus.dispatch(new TestDomainEvent());

      expect(listener.onTestDomainEvent2).toHaveBeenCalled();
    });
  });

  describe("multiple event types", () => {
    it("should handle different event types independently", async () => {
      const domainEventBus = new DomainEventBus();
      const listener = new TestListener();
      vi.spyOn(listener, "onTestDomainEvent");
      vi.spyOn(listener, "onAnotherDomainEvent");

      domainEventBus.addListener(listener);
      await domainEventBus.dispatch(new TestDomainEvent());
      await domainEventBus.dispatch(new AnotherDomainEvent());

      expect(listener.onTestDomainEvent).toHaveBeenCalled();
      expect(listener.onAnotherDomainEvent).toHaveBeenCalled();
    });
  });

  describe("custom event names", () => {
    it("should use eventName property instead of constructor name when available", async () => {
      class EventWithCustomName implements DomainEvent {
        static eventName = "testing.customEvent";
      }

      class BothNamesListener implements DomainEventListener {
        @onDomainEvent("testing.customEvent")
        onOverriddenEvent() {}

        @onDomainEvent(EventWithCustomName)
        onEventByClass() {}
      }

      const domainEventBus = new DomainEventBus();
      const listener = new BothNamesListener();
      vi.spyOn(listener, "onOverriddenEvent");
      vi.spyOn(listener, "onEventByClass");

      domainEventBus.addListener(listener);
      await domainEventBus.dispatch(new EventWithCustomName());

      expect(listener.onOverriddenEvent).toHaveBeenCalled();
      expect(listener.onEventByClass).toHaveBeenCalled();
    });
  });
});
