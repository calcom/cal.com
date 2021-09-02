/// <reference types="cypress" />

describe("as a free user", () => {
  it("it only displays 1 event on booking page", () => {
    cy.visit("/free");
  });
});
