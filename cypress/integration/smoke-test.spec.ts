describe("smoke test", () => {
  it("loads /", () => {
    cy.visit("/");
    cy.contains("Sign in to your account");
  });
});
