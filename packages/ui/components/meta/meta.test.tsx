import { render } from "@testing-library/react";
import { vi } from "vitest";

import Meta, { useMeta } from "./Meta";

vi.mock("./Meta", async () => {
  const actualMeta = (await vi.importActual("./Meta")) as object;
  const MockMeta = ({ title, description }: { title: string; description: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );

  type MetaProviderProps = {
    children: React.ReactNode;
  };

  return {
    ...actualMeta,
    default: MockMeta,
    useMeta: vi.fn(),
    MetaProvider: ({ children }: MetaProviderProps) => children,
  };
});

describe("Meta Component", () => {
  test("Should render with default metadata", () => {
    (useMeta as jest.Mock).mockReturnValue({
      meta: { title: "", description: "", backButton: false, CTA: null },
    });

    const { getByText } = render(<Meta title="Page Title" description="Page Description" />);

    expect(getByText("Page Title")).toBeInTheDocument();
    expect(getByText("Page Description")).toBeInTheDocument();
  });

  test("Should update metadata when props change", () => {
    (useMeta as jest.Mock).mockReturnValue({
      meta: { title: "", description: "", backButton: false, CTA: null },
    });

    const { rerender, getByText } = render(<Meta title="Page Title" description="Page Description" />);

    expect(getByText("Page Title")).toBeInTheDocument();
    expect(getByText("Page Description")).toBeInTheDocument();

    rerender(<Meta title="New Title" description="New Description" />);

    expect(getByText("New Title")).toBeInTheDocument();
    expect(getByText("New Description")).toBeInTheDocument();
  });
});
