/// <reference types="cypress" />

describe("silly test", () => {
  it("loads /", () => {
    cy.visit("/");
    cy.contains("Sign in to your account");
  });
});
