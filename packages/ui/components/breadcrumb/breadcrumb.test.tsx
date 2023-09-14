import { render, screen } from "@testing-library/react";

import { Breadcrumb, BreadcrumbItem } from "./Breadcrumb";

describe("Tests for Breadcrumb component", () => {
  test("Should render correctly with no items", () => {
    render(
      <Breadcrumb>
        <div>Dummy Child</div>
      </Breadcrumb>
    );

    const breadcrumbNav = screen.getByRole("navigation");
    expect(breadcrumbNav).toBeInTheDocument();

    const separators = screen.queryAllByText("/");
    expect(separators).toHaveLength(0);
  });

  test("Should render correctly with custom list props", () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem href="/" listProps={{ className: "custom-list" }}>
          Home
        </BreadcrumbItem>
        <BreadcrumbItem href="/about" listProps={{ className: "custom-list" }}>
          About
        </BreadcrumbItem>
        <BreadcrumbItem href="/contact" listProps={{ className: "custom-list" }}>
          Contact
        </BreadcrumbItem>
      </Breadcrumb>
    );

    const customListItems = document.querySelectorAll(".custom-list");
    expect(customListItems.length).toBe(3);
  });

  test("Should generate correct hrefs and labels", () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem href="/category">Category</BreadcrumbItem>
        <BreadcrumbItem href="/category/item">Item</BreadcrumbItem>
      </Breadcrumb>
    );

    const categoryLink = screen.getByText("Category");
    const itemLink = screen.getByText("Item");

    expect(categoryLink.getAttribute("href")).toBe("/category");
    expect(itemLink.getAttribute("href")).toBe("/category/item");
  });

  test("Should /category be a anchor tag", async () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem href="/category">Category</BreadcrumbItem>
        <BreadcrumbItem href="/category/item">Item</BreadcrumbItem>
      </Breadcrumb>
    );

    const categoryLink = screen.getByText("Category");
    const categoryAnchor = categoryLink.closest("a");
    const categoryItem = categoryAnchor?.parentElement;

    expect(categoryAnchor).toBeInTheDocument();
    expect(categoryItem?.tagName).toBe("LI");
    expect(categoryAnchor?.getAttribute("href")).toBe("/category");
  });

  test("Should not render separators when there is only one item", () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
      </Breadcrumb>
    );

    const separators = screen.queryAllByText("/");
    expect(separators).toHaveLength(0);
  });

  test("Should render breadcrumbs with correct order when rendered in reverse order", () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem href="/contact">Contact</BreadcrumbItem>
        <BreadcrumbItem href="/about">About</BreadcrumbItem>
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
      </Breadcrumb>
    );

    const breadcrumbList = screen.getByRole("list");
    const breadcrumbItems = screen.getAllByRole("listitem");

    expect(breadcrumbItems).toHaveLength(3);
    expect(breadcrumbList).toContainElement(breadcrumbItems[2]);
    expect(breadcrumbList).toContainElement(breadcrumbItems[1]);
    expect(breadcrumbList).toContainElement(breadcrumbItems[0]);
    expect(breadcrumbItems[2]).toHaveTextContent("Home");
    expect(breadcrumbItems[1]).toHaveTextContent("About");
    expect(breadcrumbItems[0]).toHaveTextContent("Contact");

    const separators = screen.getAllByText("/");
    expect(separators).toHaveLength(2);
  });
});
