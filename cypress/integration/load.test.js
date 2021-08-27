/// <reference types="cypress" />

test("load /", () => {
  cy.visit("/");
  cy.contains("Sign in to your account");
});
