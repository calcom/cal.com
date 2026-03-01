import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton, SkeletonAvatar, SkeletonButton, SkeletonContainer, SkeletonText } from "./Skeleton";

describe("SkeletonContainer", () => {
  it("renders children when not loading", () => {
    render(
      <SkeletonContainer as="div">
        <span>Content</span>
      </SkeletonContainer>
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});

describe("Skeleton", () => {
  it("renders with animate-pulse when loading", () => {
    const { container } = render(
      <Skeleton as="p" loading>
        Loading text
      </Skeleton>
    );
    const el = container.firstElementChild;
    expect(el?.className).toContain("animate-pulse");
  });

  it("renders children without animation when not loading", () => {
    render(<Skeleton as="p">Static content</Skeleton>);
    expect(screen.getByText("Static content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <Skeleton as="div" className="my-skeleton" loading>
        test
      </Skeleton>
    );
    const el = container.firstElementChild;
    expect(el?.className).toContain("my-skeleton");
  });
});

describe("SkeletonAvatar", () => {
  it("renders with default size", () => {
    const { container } = render(<SkeletonAvatar />);
    const el = container.firstElementChild;
    expect(el?.className).toContain("rounded-full");
  });

  it("applies custom className", () => {
    const { container } = render(<SkeletonAvatar className="custom-avatar" />);
    const el = container.firstElementChild;
    expect(el?.className).toContain("custom-avatar");
  });
});

describe("SkeletonText", () => {
  it("renders with animate-pulse", () => {
    const { container } = render(<SkeletonText />);
    const el = container.firstElementChild;
    expect(el?.className).toContain("animate-pulse");
  });

  it("applies custom className", () => {
    const { container } = render(<SkeletonText className="custom-text" />);
    const el = container.firstElementChild;
    expect(el?.className).toContain("custom-text");
  });
});

describe("SkeletonButton", () => {
  it("renders with animate-pulse on container", () => {
    const { container } = render(<SkeletonButton />);
    const el = container.firstElementChild;
    expect(el?.className).toContain("animate-pulse");
  });

  it("applies custom className to inner div", () => {
    const { container } = render(<SkeletonButton className="custom-btn" />);
    const innerDiv = container.querySelector(".custom-btn");
    expect(innerDiv).toBeInTheDocument();
  });
});
