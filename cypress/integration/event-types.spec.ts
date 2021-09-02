before(() => {
  cy.visit("/event-types");
  cy.login("pro@example.com", "pro");
});
function randomString(length: number) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

describe("/event-types", () => {
  beforeEach(() => {
    cy.visit("/event-types");
  });
  it("has at least 2 events", () => {
    cy.get("[data-testid=event-types]").children().should("have.length.at.least", 2);
  });

  it("can add new event type", () => {
    cy.get("[data-testid=new-event-type]").click();
    const nonce = randomString(3);
    const eventTitle = `hello ${nonce}`;
    cy.get("[name=title]").focus().type(eventTitle);
    cy.get("[name=length]").focus().type("10");
    cy.get("[type=submit]").click();
    cy.contains("event type created successfully");
    cy.visit("/event-types");

    cy.get("[data-testid=event-types]").contains(eventTitle);
  });
});
