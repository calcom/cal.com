import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { CreateANewTeamForm } from "../CreateANewTeamForm";

function getTitleAndSlugInputs() {
  const textboxes = screen.getAllByRole("textbox");
  const titleInput = textboxes[0] as HTMLInputElement;
  const slugInput = textboxes[1] as HTMLInputElement;
  return { titleInput, slugInput };
}

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({
      viewer: {
        eventTypes: {
          getUserEventGroups: {
            invalidate: () => {},
          },
        },
      },
    }),
    viewer: {
      teams: {
        create: {
          useMutation: () => ({ isPending: false, mutate: () => {} }),
        },
      },
    },
  },
}));

vi.mock("@calcom/features/ee/organizations/context/provider", () => ({
  useOrgBranding: () => ({ fullDomain: "https://example.org" }),
}));

describe("CreateANewTeamForm - Slug Auto-Sync Behavior", () => {
  const defaultProps = {
    inDialog: false,
    onCancel: () => {},
    submitLabel: "create",
    onSuccess: vi.fn(),
    slug: undefined,
  } as const;

  it("should auto-sync slug when name changes and behave like event form", async () => {
    render(<CreateANewTeamForm {...defaultProps} />);

    const { titleInput, slugInput } = getTitleAndSlugInputs();

    // Initially empty
    expect(titleInput.value).toBe("");
    expect(slugInput.value).toBe("");

    // Type team name
    fireEvent.change(titleInput, { target: { value: "Acme Inc" } });
    await waitFor(() => expect(slugInput.value).toBe("acme-inc"));

    // Focus slug and blur without editing - auto-sync should continue
    fireEvent.focus(slugInput);
    fireEvent.blur(slugInput);
    fireEvent.change(titleInput, { target: { value: "Acme Incorporated" } });
    await waitFor(() => expect(slugInput.value).toBe("acme-incorporated"));

    // Edit slug manually - stops auto-sync
    fireEvent.change(slugInput, { target: { value: "custom-acme" } });
    await waitFor(() => expect(slugInput.value).toBe("custom-acme"));

    fireEvent.change(titleInput, { target: { value: "Acme Updated" } });
    // slug should remain custom
    await waitFor(() => expect(slugInput.value).toBe("custom-acme"));
  });
});
