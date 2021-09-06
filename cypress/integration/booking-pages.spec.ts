/* eslint-disable @typescript-eslint/no-explicit-any */
describe("booking pages", () => {
  describe("free user", () => {
    it("only one visibile event", () => {
      cy.visit("/free");
      cy.get("[data-testid=event-types]").children().should("have.length", 1);
      cy.get('[href="/free/30min"]').should("exist");
      cy.get('[href="/free/60min"]').should("not.exist");
    });

    it("/free/30min is bookable", () => {
      cy.request({
        method: "GET",
        url: "/free/30min",
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eql(200);
      });
    });

    it("/free/60min is not bookable", () => {
      cy.request({
        method: "GET",
        url: "/free/60min",
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eql(404);
      });
    });
  });
  it("pro user's page has at least 2 visibile events", () => {
    cy.visit("/pro");
    cy.get("[data-testid=event-types]").children().should("have.length.at.least", 2);
  });

  describe("free user with first hidden", () => {
    it("has no visible events", () => {
      cy.visit("/free-first-hidden");
      cy.contains("This user hasn't set up any event types yet.");
    });

    it("/free-first-hidden/30min is not bookable", () => {
      cy.request({
        method: "GET",
        url: "/free-first-hidden/30min",
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eql(404);
      });
    });

    it("/free-first-hidden/60min is not bookable", () => {
      cy.request({
        method: "GET",
        url: "/free-first-hidden/60min",
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eql(404);
      });
    });
  });
});
