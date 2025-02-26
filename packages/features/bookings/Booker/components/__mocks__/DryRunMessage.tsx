vi.mock("../DryRunMessage", () => ({
  DryRunMessage: ({ isEmbed }: { isEmbed: boolean }) => (
    <div data-testid="dry-run-message">Mock Dry Run Message</div>
  ),
}));
