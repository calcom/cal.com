import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockApiRequest: ReturnType<typeof vi.fn> = vi.fn();
vi.mock("../lib/api", () => ({
  apiRequest: mockApiRequest,
}));

const mockReadConfig: ReturnType<typeof vi.fn> = vi.fn().mockReturnValue({});
const mockWriteConfig: ReturnType<typeof vi.fn> = vi.fn();
const mockGetAuthToken: ReturnType<typeof vi.fn> = vi.fn().mockReturnValue("cal_test_key");
const mockGetApiUrl: ReturnType<typeof vi.fn> = vi.fn().mockReturnValue("https://api.cal.com");

vi.mock("../lib/config", () => ({
  readConfig: mockReadConfig,
  writeConfig: mockWriteConfig,
  getAuthToken: mockGetAuthToken,
  getApiKey: mockGetAuthToken,
  getApiUrl: mockGetApiUrl,
}));

describe("commands", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let _errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    _errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApiRequest.mockReset();
    mockWriteConfig.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("registerAgendaCommand", () => {
    it("registers agenda command on program", async () => {
      const { registerAgendaCommand } = await import("./agenda");
      const program = new Command();
      program.exitOverride();
      registerAgendaCommand(program);
      const agendaCmd = program.commands.find((c) => c.name() === "agenda");
      expect(agendaCmd).toBeDefined();
      expect(agendaCmd?.description()).toBe("Show upcoming bookings");
    });

    it("displays upcoming bookings", async () => {
      mockApiRequest.mockResolvedValue({
        status: "success",
        data: [
          {
            id: 1,
            uid: "abc12345-def",
            title: "Team Meeting",
            status: "accepted",
            start: "2026-03-01T10:00:00Z",
            end: "2026-03-01T10:30:00Z",
            duration: 30,
            attendees: [{ name: "Alice", email: "alice@test.com", timeZone: "UTC" }],
          },
        ],
      });

      const { registerAgendaCommand } = await import("./agenda");
      const program = new Command();
      program.exitOverride();
      registerAgendaCommand(program);
      await program.parseAsync(["agenda"], { from: "user" });

      expect(mockApiRequest).toHaveBeenCalledWith("/v2/bookings", {
        query: { status: "upcoming", sortStart: "asc", take: "25" },
      });
      expect(logSpy).toHaveBeenCalled();
    });

    it("handles empty bookings", async () => {
      mockApiRequest.mockResolvedValue({ status: "success", data: [] });

      const { registerAgendaCommand } = await import("./agenda");
      const program = new Command();
      program.exitOverride();
      registerAgendaCommand(program);
      await program.parseAsync(["agenda"], { from: "user" });

      const output = logSpy.mock.calls.map((c) => String(c[0])).join(" ");
      expect(output).toContain("No upcoming bookings");
    });

    it("outputs JSON when --json flag is used", async () => {
      const bookingsData = [
        {
          id: 1,
          uid: "abc12345",
          title: "Meeting",
          status: "accepted",
          start: "2026-03-01T10:00:00Z",
          end: "2026-03-01T10:30:00Z",
          duration: 30,
          attendees: [],
        },
      ];
      mockApiRequest.mockResolvedValue({ status: "success", data: bookingsData });

      const { registerAgendaCommand } = await import("./agenda");
      const program = new Command();
      program.exitOverride();
      registerAgendaCommand(program);
      await program.parseAsync(["agenda", "--json"], { from: "user" });

      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(bookingsData, null, 2));
    });

    it("respects --take option", async () => {
      mockApiRequest.mockResolvedValue({ status: "success", data: [] });

      const { registerAgendaCommand } = await import("./agenda");
      const program = new Command();
      program.exitOverride();
      registerAgendaCommand(program);
      await program.parseAsync(["agenda", "--take", "5"], { from: "user" });

      expect(mockApiRequest).toHaveBeenCalledWith("/v2/bookings", {
        query: { status: "upcoming", sortStart: "asc", take: "5" },
      });
    });
  });

  describe("registerMeCommand", () => {
    it("registers me command with whoami alias", async () => {
      const { registerMeCommand } = await import("./me");
      const program = new Command();
      program.exitOverride();
      registerMeCommand(program);
      const meCmd = program.commands.find((c) => c.name() === "me");
      expect(meCmd).toBeDefined();
      expect(meCmd?.alias()).toBe("whoami");
    });

    it("displays user profile", async () => {
      mockApiRequest.mockResolvedValue({
        status: "success",
        data: {
          id: 42,
          username: "testuser",
          name: "Test User",
          email: "test@cal.com",
          timeZone: "America/New_York",
          defaultScheduleId: 1,
          weekStart: "Monday",
          createdDate: "2024-01-01T00:00:00Z",
        },
      });

      const { registerMeCommand } = await import("./me");
      const program = new Command();
      program.exitOverride();
      registerMeCommand(program);
      await program.parseAsync(["me"], { from: "user" });

      expect(mockApiRequest).toHaveBeenCalledWith("/v2/me");
      expect(logSpy).toHaveBeenCalled();
    });

    it("handles no profile data", async () => {
      mockApiRequest.mockResolvedValue({ status: "success", data: undefined });

      const { registerMeCommand } = await import("./me");
      const program = new Command();
      program.exitOverride();
      registerMeCommand(program);
      await program.parseAsync(["me"], { from: "user" });

      const output = logSpy.mock.calls.map((c) => String(c[0])).join(" ");
      expect(output).toContain("No profile data");
    });

    it("outputs JSON when --json flag is used", async () => {
      const meData = {
        id: 42,
        username: "testuser",
        name: "Test User",
        email: "test@cal.com",
        timeZone: "UTC",
        defaultScheduleId: null,
        weekStart: "Monday",
        createdDate: "2024-01-01T00:00:00Z",
      };
      mockApiRequest.mockResolvedValue({ status: "success", data: meData });

      const { registerMeCommand } = await import("./me");
      const program = new Command();
      program.exitOverride();
      registerMeCommand(program);
      await program.parseAsync(["me", "--json"], { from: "user" });

      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(meData, null, 2));
    });
  });

  describe("registerLoginCommand / registerLogoutCommand", () => {
    it("registers login command", async () => {
      const { registerLoginCommand } = await import("./login");
      const program = new Command();
      program.exitOverride();
      registerLoginCommand(program);
      const loginCmd = program.commands.find((c) => c.name() === "login");
      expect(loginCmd).toBeDefined();
    });

    it("saves API key via --api-key option", async () => {
      const { registerLoginCommand } = await import("./login");
      const program = new Command();
      program.exitOverride();
      registerLoginCommand(program);
      await program.parseAsync(["login", "--api-key", "cal_test123"], { from: "user" });

      expect(mockWriteConfig).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "cal_test123" }));
    });

    it("saves API URL via --api-url option", async () => {
      const { registerLoginCommand } = await import("./login");
      const program = new Command();
      program.exitOverride();
      registerLoginCommand(program);
      await program.parseAsync(["login", "--api-key", "cal_test123", "--api-url", "https://custom.api.com"], {
        from: "user",
      });

      expect(mockWriteConfig).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: "cal_test123", apiUrl: "https://custom.api.com" })
      );
    });

    it("registers logout command", async () => {
      const { registerLogoutCommand } = await import("./login");
      const program = new Command();
      program.exitOverride();
      registerLogoutCommand(program);
      const logoutCmd = program.commands.find((c) => c.name() === "logout");
      expect(logoutCmd).toBeDefined();
    });

    it("clears config on logout", async () => {
      const { registerLogoutCommand } = await import("./login");
      const program = new Command();
      program.exitOverride();
      registerLogoutCommand(program);
      await program.parseAsync(["logout"], { from: "user" });

      expect(mockWriteConfig).toHaveBeenCalledWith({});
    });
  });

  describe("registerBookingsCommand", () => {
    it("registers bookings command with subcommands", async () => {
      const { registerBookingsCommand } = await import("./bookings");
      const program = new Command();
      program.exitOverride();
      registerBookingsCommand(program);
      const bookingsCmd = program.commands.find((c) => c.name() === "bookings");
      expect(bookingsCmd).toBeDefined();

      const subcommands = bookingsCmd?.commands.map((c) => c.name());
      expect(subcommands).toContain("list");
      expect(subcommands).toContain("get");
      expect(subcommands).toContain("create");
      expect(subcommands).toContain("cancel");
      expect(subcommands).toContain("reschedule");
      expect(subcommands).toContain("confirm");
      expect(subcommands).toContain("decline");
      expect(subcommands).toContain("reassign");
    });

    it("lists bookings with status filter", async () => {
      mockApiRequest.mockResolvedValue({ status: "success", data: [] });

      const { registerBookingsCommand } = await import("./bookings");
      const program = new Command();
      program.exitOverride();
      registerBookingsCommand(program);
      await program.parseAsync(["bookings", "list", "--status", "upcoming"], { from: "user" });

      expect(mockApiRequest).toHaveBeenCalledWith(
        "/v2/bookings",
        expect.objectContaining({ query: expect.objectContaining({ status: "upcoming" }) })
      );
    });

    it("gets booking by UID", async () => {
      mockApiRequest.mockResolvedValue({
        status: "success",
        data: {
          id: 1,
          uid: "test-uid-123",
          title: "Test Booking",
          status: "accepted",
          start: "2026-03-01T10:00:00Z",
          end: "2026-03-01T10:30:00Z",
          duration: 30,
          attendees: [],
        },
      });

      const { registerBookingsCommand } = await import("./bookings");
      const program = new Command();
      program.exitOverride();
      registerBookingsCommand(program);
      await program.parseAsync(["bookings", "get", "test-uid-123"], { from: "user" });

      expect(mockApiRequest).toHaveBeenCalledWith("/v2/bookings/test-uid-123");
    });

    it("cancels a booking", async () => {
      mockApiRequest.mockResolvedValue({ status: "success", data: {} });

      const { registerBookingsCommand } = await import("./bookings");
      const program = new Command();
      program.exitOverride();
      registerBookingsCommand(program);
      await program.parseAsync(["bookings", "cancel", "test-uid", "--reason", "Testing"], { from: "user" });

      expect(mockApiRequest).toHaveBeenCalledWith(
        "/v2/bookings/test-uid/cancel",
        expect.objectContaining({
          method: "POST",
          body: { cancellationReason: "Testing" },
        })
      );
    });

    it("confirms a booking", async () => {
      mockApiRequest.mockResolvedValue({ status: "success", data: {} });

      const { registerBookingsCommand } = await import("./bookings");
      const program = new Command();
      program.exitOverride();
      registerBookingsCommand(program);
      await program.parseAsync(["bookings", "confirm", "test-uid"], { from: "user" });

      expect(mockApiRequest).toHaveBeenCalledWith(
        "/v2/bookings/test-uid/confirm",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("declines a booking", async () => {
      mockApiRequest.mockResolvedValue({ status: "success", data: {} });

      const { registerBookingsCommand } = await import("./bookings");
      const program = new Command();
      program.exitOverride();
      registerBookingsCommand(program);
      await program.parseAsync(["bookings", "decline", "test-uid"], { from: "user" });

      expect(mockApiRequest).toHaveBeenCalledWith(
        "/v2/bookings/test-uid/decline",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("reassigns a booking", async () => {
      mockApiRequest.mockResolvedValue({ status: "success", data: {} });

      const { registerBookingsCommand } = await import("./bookings");
      const program = new Command();
      program.exitOverride();
      registerBookingsCommand(program);
      await program.parseAsync(["bookings", "reassign", "test-uid"], { from: "user" });

      expect(mockApiRequest).toHaveBeenCalledWith(
        "/v2/bookings/test-uid/reassign",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("registerEventTypesCommand", () => {
    it("registers event-types command with subcommands", async () => {
      const { registerEventTypesCommand } = await import("./event-types");
      const program = new Command();
      program.exitOverride();
      registerEventTypesCommand(program);
      const cmd = program.commands.find((c) => c.name() === "event-types");
      expect(cmd).toBeDefined();

      const subcommands = cmd?.commands.map((c) => c.name());
      expect(subcommands).toContain("list");
      expect(subcommands).toContain("get");
      expect(subcommands).toContain("create");
      expect(subcommands).toContain("update");
      expect(subcommands).toContain("delete");
    });

    it("lists event types", async () => {
      mockApiRequest.mockResolvedValue({
        status: "success",
        data: [
          {
            id: 1,
            title: "30min Meeting",
            slug: "30min",
            length: 30,
            hidden: false,
          },
        ],
      });

      const { registerEventTypesCommand } = await import("./event-types");
      const program = new Command();
      program.exitOverride();
      registerEventTypesCommand(program);
      await program.parseAsync(["event-types", "list"], { from: "user" });

      expect(mockApiRequest).toHaveBeenCalledWith(
        "/v2/event-types",
        expect.objectContaining({
          headers: { "cal-api-version": "2024-06-14" },
        })
      );
    });

    it("deletes an event type", async () => {
      mockApiRequest.mockResolvedValue({ status: "success" });

      const { registerEventTypesCommand } = await import("./event-types");
      const program = new Command();
      program.exitOverride();
      registerEventTypesCommand(program);
      await program.parseAsync(["event-types", "delete", "42"], { from: "user" });

      expect(mockApiRequest).toHaveBeenCalledWith(
        "/v2/event-types/42",
        expect.objectContaining({
          method: "DELETE",
          headers: { "cal-api-version": "2024-06-14" },
        })
      );
    });
  });

  describe("registerSchedulesCommand", () => {
    it("registers schedules command with subcommands", async () => {
      const { registerSchedulesCommand } = await import("./schedules");
      const program = new Command();
      program.exitOverride();
      registerSchedulesCommand(program);
      const cmd = program.commands.find((c) => c.name() === "schedules");
      expect(cmd).toBeDefined();

      const subcommands = cmd?.commands.map((c) => c.name());
      expect(subcommands).toContain("list");
      expect(subcommands).toContain("get");
      expect(subcommands).toContain("get-default");
      expect(subcommands).toContain("create");
      expect(subcommands).toContain("update");
      expect(subcommands).toContain("delete");
    });

    it("lists schedules", async () => {
      mockApiRequest.mockResolvedValue({
        status: "success",
        data: [{ id: 1, name: "Working Hours", isDefault: true, timeZone: "UTC" }],
      });

      const { registerSchedulesCommand } = await import("./schedules");
      const program = new Command();
      program.exitOverride();
      registerSchedulesCommand(program);
      await program.parseAsync(["schedules", "list"], { from: "user" });

      expect(mockApiRequest).toHaveBeenCalledWith(
        "/v2/schedules",
        expect.objectContaining({
          headers: { "cal-api-version": "2024-06-11" },
        })
      );
    });
  });

  describe("registerWebhooksCommand", () => {
    it("registers webhooks command with subcommands", async () => {
      const { registerWebhooksCommand } = await import("./webhooks");
      const program = new Command();
      program.exitOverride();
      registerWebhooksCommand(program);
      const cmd = program.commands.find((c) => c.name() === "webhooks");
      expect(cmd).toBeDefined();

      const subcommands = cmd?.commands.map((c) => c.name());
      expect(subcommands).toContain("list");
      expect(subcommands).toContain("get");
      expect(subcommands).toContain("create");
      expect(subcommands).toContain("update");
      expect(subcommands).toContain("delete");
    });

    it("deletes a webhook", async () => {
      mockApiRequest.mockResolvedValue({ status: "success" });

      const { registerWebhooksCommand } = await import("./webhooks");
      const program = new Command();
      program.exitOverride();
      registerWebhooksCommand(program);
      await program.parseAsync(["webhooks", "delete", "123"], { from: "user" });

      expect(mockApiRequest).toHaveBeenCalledWith("/v2/webhooks/123", { method: "DELETE" });
    });
  });

  describe("registerCalendarsCommand", () => {
    it("registers calendars command", async () => {
      const { registerCalendarsCommand } = await import("./calendars");
      const program = new Command();
      program.exitOverride();
      registerCalendarsCommand(program);
      const cmd = program.commands.find((c) => c.name() === "calendars");
      expect(cmd).toBeDefined();
    });

    it("lists calendars", async () => {
      mockApiRequest.mockResolvedValue({
        status: "success",
        data: [
          {
            credentialId: 1,
            integration: { type: "google_calendar", title: "Google Calendar" },
            calendars: [{ externalId: "cal1", name: "Work", isSelected: true, readOnly: false }],
          },
        ],
      });

      const { registerCalendarsCommand } = await import("./calendars");
      const program = new Command();
      program.exitOverride();
      registerCalendarsCommand(program);
      await program.parseAsync(["calendars", "list"], { from: "user" });

      expect(mockApiRequest).toHaveBeenCalledWith("/v2/calendars");
    });
  });

  describe("registerConferencingCommand", () => {
    it("registers conferencing command", async () => {
      const { registerConferencingCommand } = await import("./conferencing");
      const program = new Command();
      program.exitOverride();
      registerConferencingCommand(program);
      const cmd = program.commands.find((c) => c.name() === "conferencing");
      expect(cmd).toBeDefined();

      const subcommands = cmd?.commands.map((c) => c.name());
      expect(subcommands).toContain("list");
      expect(subcommands).toContain("default");
      expect(subcommands).toContain("disconnect");
    });
  });

  describe("registerApiKeysCommand", () => {
    it("registers api-keys command", async () => {
      const { registerApiKeysCommand } = await import("./api-keys");
      const program = new Command();
      program.exitOverride();
      registerApiKeysCommand(program);
      const cmd = program.commands.find((c) => c.name() === "api-keys");
      expect(cmd).toBeDefined();

      const subcommands = cmd?.commands.map((c) => c.name());
      expect(subcommands).toContain("list");
      expect(subcommands).toContain("get");
      expect(subcommands).toContain("create");
      expect(subcommands).toContain("delete");
    });
  });

  describe("registerTimezonesCommand", () => {
    it("registers timezones command", async () => {
      const { registerTimezonesCommand } = await import("./timezones");
      const program = new Command();
      program.exitOverride();
      registerTimezonesCommand(program);
      const cmd = program.commands.find((c) => c.name() === "timezones");
      expect(cmd).toBeDefined();
    });

    it("lists timezones", async () => {
      mockApiRequest.mockResolvedValue({
        status: "success",
        data: { "America/New_York": "Eastern Time", "Europe/London": "GMT" },
      });

      const { registerTimezonesCommand } = await import("./timezones");
      const program = new Command();
      program.exitOverride();
      registerTimezonesCommand(program);
      await program.parseAsync(["timezones"], { from: "user" });

      expect(mockApiRequest).toHaveBeenCalledWith("/v2/timezones");
      const output = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(output).toContain("America/New_York");
    });

    it("handles empty timezone data", async () => {
      mockApiRequest.mockResolvedValue({ status: "success", data: undefined });

      const { registerTimezonesCommand } = await import("./timezones");
      const program = new Command();
      program.exitOverride();
      registerTimezonesCommand(program);
      await program.parseAsync(["timezones"], { from: "user" });

      const output = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(output).toContain("No timezones");
    });
  });

  describe("registerSlotsCommand", () => {
    it("registers slots command", async () => {
      const { registerSlotsCommand } = await import("./slots");
      const program = new Command();
      program.exitOverride();
      registerSlotsCommand(program);
      const cmd = program.commands.find((c) => c.name() === "slots");
      expect(cmd).toBeDefined();
    });
  });

  describe("registerDestinationCalendarsCommand", () => {
    it("registers destination-calendars command", async () => {
      const { registerDestinationCalendarsCommand } = await import("./destination-calendars");
      const program = new Command();
      program.exitOverride();
      registerDestinationCalendarsCommand(program);
      const cmd = program.commands.find((c) => c.name() === "destination-calendars");
      expect(cmd).toBeDefined();
    });
  });

  describe("registerSelectedCalendarsCommand", () => {
    it("registers selected-calendars command", async () => {
      const { registerSelectedCalendarsCommand } = await import("./selected-calendars");
      const program = new Command();
      program.exitOverride();
      registerSelectedCalendarsCommand(program);
      const cmd = program.commands.find((c) => c.name() === "selected-calendars");
      expect(cmd).toBeDefined();
    });
  });
});
