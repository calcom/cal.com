import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Section } from "./section";

vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [{ current: null }],
}));

describe("Section", () => {
  it("renders root with children", () => {
    render(
      <Section>
        <div>Section Content</div>
      </Section>
    );
    expect(screen.getByText("Section Content")).toBeInTheDocument();
  });

  it("renders Header with title", () => {
    render(
      <Section>
        <Section.Header title="Settings" />
      </Section>
    );
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders Header with title and description", () => {
    render(
      <Section>
        <Section.Header title="Settings" description="Manage your preferences" />
      </Section>
    );
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Manage your preferences")).toBeInTheDocument();
  });

  it("renders Content with children", () => {
    render(
      <Section>
        <Section.Content>
          <p>Inner content</p>
        </Section.Content>
      </Section>
    );
    expect(screen.getByText("Inner content")).toBeInTheDocument();
  });

  it("renders SubSection with children", () => {
    render(
      <Section>
        <Section.SubSection>
          <div>Sub content</div>
        </Section.SubSection>
      </Section>
    );
    expect(screen.getByText("Sub content")).toBeInTheDocument();
  });

  it("renders SubSectionHeader with title", () => {
    render(
      <Section>
        <Section.SubSection>
          <Section.SubSectionHeader title="Advanced">
            <button>Toggle</button>
          </Section.SubSectionHeader>
        </Section.SubSection>
      </Section>
    );
    expect(screen.getByText("Advanced")).toBeInTheDocument();
    expect(screen.getByText("Toggle")).toBeInTheDocument();
  });

  it("renders SubSectionContent with children", () => {
    render(
      <Section>
        <Section.SubSectionContent>
          <span>Nested content</span>
        </Section.SubSectionContent>
      </Section>
    );
    expect(screen.getByText("Nested content")).toBeInTheDocument();
  });

  it("renders Header with children (action buttons)", () => {
    render(
      <Section>
        <Section.Header title="Events">
          <button>Add Event</button>
        </Section.Header>
      </Section>
    );
    expect(screen.getByText("Add Event")).toBeInTheDocument();
  });
});
