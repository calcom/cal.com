describe("booking pages", () => {
  it("free user's page has has only one visibile event", () => {
    cy.visit("/free");
    cy.get("[data-testid=event-types]").children().should("have.length", 1);
  });
  it("pro user's page has at least 2 visibile events", () => {
    cy.visit("/pro");
    cy.get("[data-testid=event-types]").children().should("have.length.at.least", 2);
  });
});
