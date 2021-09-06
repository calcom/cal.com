function randomString(length: number) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

describe("pro user", () => {
  before(() => {
    cy.visit("/event-types");
    cy.login("pro@example.com", "pro");
  });
  beforeEach(() => {
    cy.visit("/event-types");
  });

  it("has at least 2 events", () => {
    cy.get("[data-testid=event-types]").children().should("have.length.at.least", 2);
    cy.get("[data-testid=event-types]")
      .children()
      .each(($el) => {
        expect($el).to.have.attr("data-disabled", "0");
      });
  });

  it("can add new event type", () => {
    cy.get("[data-testid=new-event-type]").click();
    const nonce = randomString(3);
    const eventTitle = `hello ${nonce}`;

    cy.get("[name=title]").focus().type(eventTitle);
    cy.get("[name=length]").focus().type("10");
    cy.get("[type=submit]").click();

    cy.location("pathname").should("not.eq", "/event-types");
    cy.visit("/event-types");

    cy.get("[data-testid=event-types]").contains(eventTitle);
  });
});

describe("free user", () => {
  before(() => {
    cy.visit("/event-types");
    cy.login("free@example.com", "free");
  });
  describe("/event-types", () => {
    beforeEach(() => {
      cy.visit("/event-types");
    });

    it("has at least 2 events where first is enabled", () => {
      cy.get("[data-testid=event-types]").children().should("have.length.at.least", 2);

      cy.get("[data-testid=event-types]").children().first().should("have.attr", "data-disabled", "0");
      cy.get("[data-testid=event-types]").children().last().should("have.attr", "data-disabled", "1");
    });

    it("can not add new event type", () => {
      cy.get("[data-testid=new-event-type]").should("be.disabled");
    });
  });
});
