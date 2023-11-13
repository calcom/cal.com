import { useSession } from "next-auth/react";

export function MailLink({ subject, body }: { subject: string; body?: string }) {
  const { data } = useSession();

  return (
    <a href={`mailto:${data?.user?.username}@cal.ai?subject=${subject}&body=${body ? body : ""}`}>
      {subject ? subject : body}
    </a>
  );
}
export default function AppSettings() {
  return (
    <>
      <div className="prose-sm prose prose-a:text-default prose-headings:text-emphasis prose-code:text-default prose-strong:text-default text-default">
        <h2>Example questions:</h2>
        <ul>
          <li>
            <MailLink subject="Book a meeting with @cal-user this week at a good time" />
          </li>
          <li>
            <MailLink subject="Find a time to meet with not-a-cal-user@gmail.com this week" />
          </li>
          <li>
            <MailLink subject="Move my meeting with [Someone's Name] to next week" />
          </li>
          <li>
            <MailLink subject="What does my week look like?" />
          </li>
          <li>
            <MailLink subject="When is my next meeting?" />
          </li>
          <li>
            <MailLink subject="What is my least busy day next week?" />
          </li>
          <li>
            <MailLink subject="Cancel the meeting with [Someone's Name]" />
          </li>
          <li>
            <MailLink subject="Reschedule the meeting with not-a-cal-user@gmail.com" />
          </li>
          <li>
            <MailLink subject="Is @cal-user busy on Friday at noon?" />
          </li>
          <li>
            <MailLink subject="Move my meeting at 2pm tomorrow to next week on Friday at 5pm" />
          </li>
        </ul>
        <h3>Or, any of that in a thread:</h3>
        <ul>
          <li>
            What meetings do I have this week?
            <ul>
              <li>Meeting 1, Meeting 2</li>
            </ul>
          </li>
          <li>Cancel that first meeting</li>
        </ul>
        <h3>Or, doing multiple things:</h3>
        <ul>
          <li>
            <MailLink
              subject=""
              body="Cancel all my meetings tomorrow then book a quick chat with @joe at noon, a long meeting with
            @jane at 1 (both tomorrow). Also see if Toby is down to grab dinner this week (toby@gmail.com).
            Finally send me my updated agenda of everything I have coming up in the next couple days."
            />
          </li>
        </ul>
      </div>
    </>
  );
}
