import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Group, Indicator, Label, Radio, RadioField } from "./Radio";
import { RadioArea, RadioAreaGroup } from "./RadioAreaGroup";

describe("Radio", () => {
  it("renders a radio item within a group", () => {
    render(
      <Group defaultValue="a">
        <Radio value="a">
          <Indicator />
        </Radio>
      </Group>
    );
    const radio = screen.getByRole("radio");
    expect(radio).toBeInTheDocument();
  });

  it("renders multiple radio items", () => {
    render(
      <Group defaultValue="a">
        <Radio value="a">
          <Indicator />
        </Radio>
        <Radio value="b">
          <Indicator />
        </Radio>
      </Group>
    );
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
  });

  it("checks the default value", () => {
    render(
      <Group defaultValue="a">
        <Radio value="a">
          <Indicator />
        </Radio>
        <Radio value="b">
          <Indicator />
        </Radio>
      </Group>
    );
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toHaveAttribute("data-state", "checked");
    expect(radios[1]).toHaveAttribute("data-state", "unchecked");
  });

  it("applies disabled opacity class", () => {
    render(
      <Group defaultValue="a">
        <Radio value="a" disabled>
          <Indicator />
        </Radio>
      </Group>
    );
    const radio = screen.getByRole("radio");
    expect(radio.className).toContain("opacity-60");
  });
});

describe("Label", () => {
  it("renders label text", () => {
    render(<Label>Option A</Label>);
    expect(screen.getByText("Option A")).toBeInTheDocument();
  });

  it("applies disabled styling", () => {
    render(<Label disabled>Disabled Label</Label>);
    const label = screen.getByText("Disabled Label");
    expect(label.className).toContain("text-subtle");
  });
});

describe("RadioField", () => {
  it("renders label and radio button", () => {
    render(
      <Group defaultValue="opt1">
        <RadioField id="opt1" value="opt1" label="Option 1" />
      </Group>
    );
    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByRole("radio")).toBeInTheDocument();
  });

  it("renders disabled state", () => {
    render(
      <Group defaultValue="opt1">
        <RadioField id="opt1" value="opt1" label="Disabled Option" disabled />
      </Group>
    );
    expect(screen.getByRole("radio")).toBeDisabled();
  });

  it("applies withPadding class", () => {
    const { container } = render(
      <Group defaultValue="opt1">
        <RadioField id="opt1" value="opt1" label="Padded" withPadding />
      </Group>
    );
    const wrapper = container.querySelector("[class*='hover:bg-subtle']");
    expect(wrapper).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <Group defaultValue="opt1">
        <RadioField id="opt1" value="opt1" label="Custom" className="my-class" />
      </Group>
    );
    const wrapper = container.querySelector(".my-class");
    expect(wrapper).toBeInTheDocument();
  });
});

describe("RadioArea", () => {
  it("renders children content", () => {
    render(
      <RadioAreaGroup defaultValue="a">
        <RadioArea value="a">Area Content</RadioArea>
      </RadioAreaGroup>
    );
    expect(screen.getByText("Area Content")).toBeInTheDocument();
  });

  it("renders radio input within area", () => {
    render(
      <RadioAreaGroup defaultValue="a">
        <RadioArea value="a">Area A</RadioArea>
      </RadioAreaGroup>
    );
    expect(screen.getByRole("radio")).toBeInTheDocument();
  });

  it("renders multiple radio areas", () => {
    render(
      <RadioAreaGroup defaultValue="a">
        <RadioArea value="a">Area A</RadioArea>
        <RadioArea value="b">Area B</RadioArea>
      </RadioAreaGroup>
    );
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });
});
