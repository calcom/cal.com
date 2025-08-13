/* eslint-disable playwright/missing-playwright-await */
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import { List, ListItem, ListItemText, ListItemTitle, ListLinkItem } from "./List";

describe("Tests for List component", () => {
  test("Should be bordered with no rounded container by default", () => {
    render(<List>Go</List>);

    const listElement = screen.getByTestId("list");

    expect(listElement).toBeInTheDocument();
  });
});

describe("Tests for ListItem component", () => {
  test("Should be expanded and rounded and rendered by a LI tag by default", () => {
    render(<ListItem>Go</ListItem>);

    const listItemElement = screen.getByTestId("list-item");

    expect(listItemElement).toBeInstanceOf(HTMLLIElement);
  });

  test("Should call onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<ListItem onClick={handleClick}>Go</ListItem>);

    const listItemElement = screen.getByTestId("list-item");

    fireEvent.click(listItemElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe("Tests for ListLinkItem component", () => {
  test("Should be rendered as <a/> with heading by default", () => {
    render(
      <ListLinkItem href="https://custom.link" heading="Go" subHeading="There">
        Alright
      </ListLinkItem>
    );

    const listLinkItemElement = screen.getByTestId("list-link-item");

    const link = listLinkItemElement.firstChild;
    expect(link).toBeInstanceOf(HTMLAnchorElement);
    expect(link).toHaveAttribute("href", "https://custom.link");

    const heading = screen.getByText("Go");
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe("H1");

    const subHeading = screen.getByText("There");
    expect(subHeading).toBeInTheDocument();
    expect(subHeading.tagName).toBe("H2");
  });

  test("Should be disabled", () => {
    render(
      <ListLinkItem href="https://custom.link" heading="Go" subHeading="There" disabled={true}>
        Alright
      </ListLinkItem>
    );

    const listLinkItemElement = screen.getByTestId("list-link-item");
    const link = listLinkItemElement.firstChild;
    expect(link).toHaveClass("pointer-events-none", "cursor-not-allowed", "opacity-30");
  });

  test("Should show readonly badge", () => {
    render(
      <ListLinkItem href="https://custom.link" heading="Go" subHeading="There" readOnly={true}>
        Alright
      </ListLinkItem>
    );

    const badge = screen.getByTestId("badge");
    expect(badge).toBeInTheDocument();
  });

  test("Should apply some actions", () => {
    render(
      <ListLinkItem href="https://custom.link" heading="Go" subHeading="There" actions={<div>cta</div>}>
        Alright
      </ListLinkItem>
    );

    const action = screen.getByText("cta");
    expect(action).toBeInTheDocument();
  });
});

describe("Tests for ListItemTitle component", () => {
  test("Should render as <span> by default", () => {
    render(<ListItemTitle>Go</ListItemTitle>);

    const listItemTitleElement = screen.getByTestId("list-item-title");
    expect(listItemTitleElement).toBeInTheDocument();
    expect(listItemTitleElement.tagName).toBe("SPAN");
  });

  test("Should be rendered with the defined component", () => {
    render(<ListItemTitle component="h1">Go</ListItemTitle>);

    const listItemTitleElement = screen.getByTestId("list-item-title");
    expect(listItemTitleElement.tagName).not.toBe("SPAN");
    expect(listItemTitleElement.tagName).toBe("H1");
  });
});

describe("Tests for ListItemText component", () => {
  test("Should render as <span> by default", () => {
    render(<ListItemText>Go</ListItemText>);

    const listItemTextElement = screen.getByTestId("list-item-text");
    expect(listItemTextElement).toBeInTheDocument();
    expect(listItemTextElement.tagName).toBe("SPAN");
  });

  test("Should be rendered with the defined component", () => {
    render(<ListItemText component="div">Go</ListItemText>);

    const listItemTextElement = screen.getByTestId("list-item-text");
    expect(listItemTextElement.tagName).not.toBe("SPAN");
    expect(listItemTextElement.tagName).toBe("DIV");
  });
});
