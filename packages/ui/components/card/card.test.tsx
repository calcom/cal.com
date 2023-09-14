/* eslint-disable playwright/missing-playwright-await */
import { render, screen, fireEvent } from "@testing-library/react";

import { Card } from "./Card";

const title = "Card Title";
const description = "Card Description";

describe("Tests for Card component", () => {
  test("Should render the card with basic variant and image structure", () => {
    const variant = "basic";

    render(<Card title={title} description={description} variant={variant} structure="image" />);

    const cardTitle = screen.getByText(title);
    const cardDescription = screen.getByText(description);

    expect(cardTitle).toBeInTheDocument();
    expect(cardDescription).toBeInTheDocument();
  });

  test("Should render the card with ProfileCard variant and card structure", () => {
    const variant = "ProfileCard";
    const structure = "card";

    render(<Card title={title} description={description} variant={variant} structure={structure} />);

    const cardTitle = screen.getByText(title);
    const cardDescription = screen.getByText(description);

    expect(cardTitle).toBeInTheDocument();
    expect(cardDescription).toBeInTheDocument();
  });

  test("Should render the card with SidebarCard variant and title structure", () => {
    const variant = "SidebarCard";
    const structure = "title";

    render(<Card title={title} description={description} variant={variant} structure={structure} />);

    const cardTitle = screen.getByText(title);
    const cardDescription = screen.getByText(description);

    expect(cardTitle).toBeInTheDocument();
    expect(cardDescription).toBeInTheDocument();
  });

  test("Should render button click", () => {
    render(
      <Card title={title} description={description} variant="basic" actionButton={{ child: "Button" }} />
    );

    const buttonElement = screen.getByRole("button", { name: "Button" });

    expect(buttonElement).toBeInTheDocument();
  });

  test("Should handle link click", () => {
    render(
      <Card
        title={title}
        description={description}
        variant="basic"
        learnMore={{
          href: "http://localhost:3000/",
          text: "Learn More",
        }}
        actionButton={{ child: "Button" }}
      />
    );

    const linkElement = screen.getByRole("button", { name: "Button" });

    fireEvent.click(linkElement);

    expect(window.location.href).toBe("http://localhost:3000/");
  });

  test("Should render card with SidebarCard variant and learn more link", () => {
    render(
      <Card
        title={title}
        description={description}
        variant="SidebarCard"
        learnMore={{ href: "http://example.com", text: "Learn More" }}
      />
    );

    const cardContainer = screen.getByTestId("card-container");
    const titleElement = screen.getByText(title);
    const descriptionElement = screen.getByText(description);
    const learnMoreLink = screen.getByRole("link", { name: "Learn More" });

    expect(cardContainer).toBeInTheDocument();
    expect(titleElement).toBeInTheDocument();
    expect(descriptionElement).toBeInTheDocument();
    expect(learnMoreLink).toBeInTheDocument();
  });
});
