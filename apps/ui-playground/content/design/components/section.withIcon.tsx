"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useState } from "react";

import { Switch } from "@calcom/ui/components/form";
import { Section } from "@calcom/ui/components/section";

export const WithIconExample = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <RenderComponentWithSnippet>
      <Section>
        <Section.Header
          icon="calendar"
          title="Section with Icon"
          description="This section includes an icon in the header. Toggle to see auto-animation.">
          <Switch size="sm" checked={isOpen} onCheckedChange={setIsOpen} />
        </Section.Header>
        {isOpen && (
          <Section.Content>
            <p>
              This section demonstrates how to include an icon in the header and uses FormKit auto-animate for
              smooth transitions when toggling content visibility.
            </p>
          </Section.Content>
        )}
      </Section>
    </RenderComponentWithSnippet>
  );
};

export const WithIconExampleSnippet = `
"use client";

import { useState } from "react";
import { Section } from "@calcom/ui/components/section";
import { Switch } from "@calcom/ui/components/form";

const SectionWithIcon = () => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <Section>
        <Section.Header
          icon="calendar"
          title="Section with Icon"
          description="This section includes an icon in the header. Toggle to see auto-animation.">
          <Switch size="sm" checked={isOpen} onCheckedChange={setIsOpen} />
        </Section.Header>
        {isOpen && (
          <Section.Content>
            <p>
              This section demonstrates how to include an icon in the header and uses FormKit auto-animate for
              smooth transitions when toggling content visibility.
            </p>
          </Section.Content>
        )}
      </Section>
  );
};
`;
