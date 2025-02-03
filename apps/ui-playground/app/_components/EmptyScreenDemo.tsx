"use client";

import { Button, EmptyScreen } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

export default function EmptyScreenDemo() {
  return (
    <DemoSection title="Empty Screen">
      {/* Basic Empty Screen */}
      <DemoSubSection id="empty-screen-basic" title="Basic">
        <EmptyScreen
          Icon="calendar"
          headline="No upcoming meetings"
          description="Create a meeting to get started"
          buttonText="Create Meeting"
          buttonOnClick={() => alert("Create Meeting clicked")}
        />
      </DemoSubSection>

      {/* With Custom Icon */}
      <DemoSubSection id="empty-screen-custom-icon" title="With Custom Icon">
        <EmptyScreen
          Icon="user"
          iconClassName="text-emphasis h-12 w-12"
          headline="No team members"
          description="Add team members to collaborate"
          buttonText="Add Members"
          buttonOnClick={() => alert("Add Members clicked")}
        />
      </DemoSubSection>

      {/* With Raw Button */}
      <DemoSubSection id="empty-screen-raw-button" title="With Raw Button">
        <EmptyScreen
          Icon="link"
          headline="No links found"
          description="Create a new link to share"
          buttonRaw={
            <div className="flex space-x-2">
              <Button color="primary" onClick={() => alert("Create Link clicked")}>
                Create Link
              </Button>
              <Button color="secondary" onClick={() => alert("Import Links clicked")}>
                Import Links
              </Button>
            </div>
          }
        />
      </DemoSubSection>

      {/* Without Border */}
      <DemoSubSection id="empty-screen-no-border" title="Without Border">
        <EmptyScreen
          Icon="grid-3x3"
          headline="No apps installed"
          description="Browse available apps in the marketplace"
          buttonText="Browse Apps"
          buttonOnClick={() => alert("Browse Apps clicked")}
          border={false}
        />
      </DemoSubSection>

      {/* With Solid Border */}
      <DemoSubSection id="empty-screen-solid-border" title="With Solid Border">
        <EmptyScreen
          Icon="mail"
          headline="No messages"
          description="Your inbox is empty"
          buttonText="Compose"
          buttonOnClick={() => alert("Compose clicked")}
          dashedBorder={false}
        />
      </DemoSubSection>

      {/* With HTML Content */}
      <DemoSubSection id="empty-screen-html-content" title="With HTML Content">
        <EmptyScreen
          Icon="info"
          headline={
            <span className="text-emphasis">
              Custom Headline with <strong>HTML</strong>
            </span>
          }
          description={
            <div className="text-subtle space-y-2">
              <p>This is a custom description with multiple paragraphs.</p>
              <p>
                You can include <em>any HTML content</em> here.
              </p>
            </div>
          }
          buttonText="Learn More"
          buttonOnClick={() => alert("Learn More clicked")}
        />
      </DemoSubSection>
    </DemoSection>
  );
}
