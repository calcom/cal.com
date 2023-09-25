/* eslint-disable playwright/missing-playwright-await */
import { render, screen } from "@testing-library/react";

import { SkeletonText, SkeletonAvatar, SkeletonButton, SkeletonContainer, Skeleton } from ".";

describe("Tests for Skeleton Component", () => {
  test("should render SkeletonText component", () => {
    render(<SkeletonText />);
    expect(screen.getByTestId("skeleton-text")).toBeInTheDocument();
  });

  test("should render SkeletonAvatar component", () => {
    render(<SkeletonAvatar />);
    expect(screen.getByTestId("skeleton-avatar")).toBeInTheDocument();
  });

  test("should render SkeletonButtons component", () => {
    render(<SkeletonButton data-testid="skeleton-btn" />);
    expect(screen.getByTestId("skeleton-btn")).toBeInTheDocument();
  });

  test("should render Skeleton component", () => {
    render(<Skeleton as="div">Hello Skeleton</Skeleton>);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.getByText("Hello Skeleton")).toBeInTheDocument();
  });

  test("should render SkeletonContainer component", () => {
    render(
      <SkeletonContainer>
        <SkeletonText className="h-6 w-48 " />
        <SkeletonButton className="h-3 w-10" />
      </SkeletonContainer>
    );
    expect(screen.getAllByTestId("skeleton-container")).toHaveLength(2);
    expect(screen.getByTestId("skeleton-text")).toBeInTheDocument();
    expect(screen.getByTestId("skeleton-btn")).toBeInTheDocument();
  });
});
