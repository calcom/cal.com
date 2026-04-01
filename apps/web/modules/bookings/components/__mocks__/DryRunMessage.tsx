import { vi } from "vitest";
vi.mock("@calcom/features/bookings/Booker/components/DryRunMessage", () => ({
  DryRunMessage: ({ isEmbed }: { isEmbed: boolean }) => (
    <div data-testid="dry-run-message">Mock Dry Run Message</div>
  ),
}));
