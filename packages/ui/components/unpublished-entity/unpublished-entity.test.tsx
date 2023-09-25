import { render, screen } from "@testing-library/react";

import { UnpublishedEntity } from "./UnpublishedEntity";

describe("Tests for UnpublishedEntity component", () => {
  test("should render unpublished entity", () => {
    render(<UnpublishedEntity name="Feature" orgSlug="example" />);
    expect(screen.getByTestId("unpublished-entity")).toBeInTheDocument();
    expect(screen.getByTestId("empty-screen")).toBeInTheDocument();
  });
});
