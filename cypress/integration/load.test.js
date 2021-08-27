/// <reference types="cypress" />

describe("load /", () => {
  cy.visit("/");
  cy.contains("Sign in to your account");
});
