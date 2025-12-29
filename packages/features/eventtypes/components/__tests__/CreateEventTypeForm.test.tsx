import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { vi } from "vitest";

import type { CreateEventTypeFormValues } from "@calcom/features/eventtypes/hooks/useCreateEventType";

import CreateEventTypeForm from "../CreateEventTypeForm";

function getTitleAndSlugInputs() {
  const textboxes = screen.getAllByRole("textbox");
  const titleInput = textboxes[0] as HTMLInputElement;
  const slugInput = textboxes[1] as HTMLInputElement;
  return { titleInput, slugInput };
}

describe("CreateEventTypeForm - Slug Auto-Sync Behavior", () => {
  const TestFormWrapper = ({
    urlPrefix = "https://example.com/user",
    onSubmit = vi.fn(),
  }: {
    urlPrefix?: string;
    onSubmit?: (values: CreateEventTypeFormValues) => void;
  }) => {
    const form = useForm({
      defaultValues: {
        slug: "",
        title: "",
        length: 15,
        description: "",
      },
    });

    return (
      <CreateEventTypeForm
        form={form}
        isManagedEventType={false}
        handleSubmit={onSubmit}
        urlPrefix={urlPrefix}
        pageSlug="user"
        isPending={false}
        SubmitButton={(isPending) => (
          <button type="submit" data-testid="submit-btn">
            {isPending ? "Creating..." : "Create Event"}
          </button>
        )}
      />
    );
  };

  it("should auto-sync slug when title changes and behave like team form", async () => {
    render(<TestFormWrapper />);

    const { titleInput, slugInput } = getTitleAndSlugInputs();

    // Initially empty
    expect(titleInput.value).toBe("");
    expect(slugInput.value).toBe("");

    // Type in title
    fireEvent.change(titleInput, { target: { value: "Quick Chat" } });
    await waitFor(() => expect(slugInput.value).toBe("quick-chat"));

    // Focus slug and blur without editing - auto-sync should continue
    fireEvent.focus(slugInput);
    fireEvent.blur(slugInput);
    fireEvent.change(titleInput, { target: { value: "Quick Chat Meeting" } });
    await waitFor(() => expect(slugInput.value).toBe("quick-chat-meeting"));

    // Edit slug manually - stops auto-sync
    fireEvent.change(slugInput, { target: { value: "custom-slug" } });
    await waitFor(() => expect(slugInput.value).toBe("custom-slug"));

    fireEvent.change(titleInput, { target: { value: "Quick Chat Meeting Updated" } });
    // slug should remain custom
    await waitFor(() => expect(slugInput.value).toBe("custom-slug"));
  });
});
