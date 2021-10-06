import { expect, it } from "@jest/globals";

import { html, text, Invitation } from "@lib/emails/invitation";

it("email text rendering should strip tags and add new lines", () => {
  const result = text("<p>hello world</p><br /><div>welcome to the brave <span>new</span> world");
  expect(result).toEqual("hello world\nwelcome to the brave new world");
});

it("email html should render invite email", () => {
  const invitation = {
    from: "Huxley",
    toEmail: "hello@example.com",
    teamName: "Calendar Lovers",
    token: "invite-token",
  } as Invitation;
  const result = html(invitation);
  expect(result).toContain('<br />Huxley invited you to join the team "Calendar Lovers" in Cal.com.<br />');
  expect(result).toContain("/auth/signup?token=invite-token&");
  expect(result).toContain(
    'If you prefer not to use "hello@example.com" as your Cal.com email or already have a Cal.com account, please request another invitation to that email.'
  );
});
