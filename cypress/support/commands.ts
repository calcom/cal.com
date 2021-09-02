/* eslint-disable @typescript-eslint/no-namespace */

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable;
    }
  }
}
Cypress.Commands.add("login", (email: string, password: string) => {
  cy.log(` 🗝 Logging in with ${email}`);

  Cypress.Cookies.defaults({
    preserve: /next-auth/,
  });
  cy.clearCookies();
  cy.clearCookie("next-auth.session-token");
  cy.reload();

  cy.get("[name=email]").focus().clear().type(email);
  cy.get("[name=password]").focus().clear().type(password);
  cy.get("[type=submit]").click();
  cy.wait(500);
});

export {};
