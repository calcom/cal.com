describe("cancel", () => {
  describe("Admin user can cancel events", () => {
    before(() => {
      cy.visit("/bookings");
      cy.login("pro@example.com", "pro");
    });
    it("can cancel bookings", () => {
      cy.visit("/bookings");
      cy.get("[data-testid=bookings]").children().should("have.length.at.least", 1);
      cy.get("[data-testid=cancel]").click();

      cy.location("pathname").should("contain", "/cancel/");

      cy.get("[data-testid=cancel]").click();

      cy.location("pathname").should("contain", "/cancel/success");

      cy.get("[data-testid=back-to-bookings]").click();

      cy.location("pathname").should("eq", "/bookings");
      cy.get("[data-testid=bookings]").children().should("have.length", 0);
    });
  });
});
