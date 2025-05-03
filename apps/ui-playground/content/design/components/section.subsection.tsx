"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useState } from "react";

import { Input, Switch } from "@calcom/ui/components/form";
import { Section } from "@calcom/ui/components/section";

export const SubSectionExample = () => {
  const [isMainOpen, setIsMainOpen] = useState(true);
  const [isFirstSubsectionOpen, setIsFirstSubsectionOpen] = useState(true);
  const [isSecondSubsectionOpen, setIsSecondSubsectionOpen] = useState(true);

  return (
    <RenderComponentWithSnippet>
      <Section>
        <Section.Header
          icon="calendar"
          title="Section with Subsections"
          description="This section contains nested subsections">
          <Switch size="sm" checked={isMainOpen} onCheckedChange={setIsMainOpen} />
        </Section.Header>
        {isMainOpen && (
          <Section.Content>
            <Section.SubSection>
              <Section.SubSectionHeader icon="zap" title="Automatic Sync (Justify Start)" justify="start">
                <Switch size="sm" />
              </Section.SubSectionHeader>
            </Section.SubSection>
            <Section.SubSection>
              <Section.SubSectionHeader icon="user" title="Create new records for guests added">
                <Switch
                  size="sm"
                  checked={isFirstSubsectionOpen}
                  onCheckedChange={setIsFirstSubsectionOpen}
                />
              </Section.SubSectionHeader>
              {isFirstSubsectionOpen && (
                <Section.SubSectionContent>
                  <p>This is the content of the first subsection.</p>
                </Section.SubSectionContent>
              )}
            </Section.SubSection>
            <Section.SubSection>
              <Section.SubSectionHeader icon="settings" title="Open Settings">
                <Switch
                  size="sm"
                  checked={isSecondSubsectionOpen}
                  onCheckedChange={setIsSecondSubsectionOpen}
                />
              </Section.SubSectionHeader>
              {isSecondSubsectionOpen && (
                <Section.SubSectionContent>
                  <div className="flex gap-3 px-3 py-1.5">
                    <div className="text-subtle w-full text-sm font-medium">Field Name</div>
                    <div className="text-subtle w-full text-sm font-medium">Field Type</div>
                    <div className="text-subtle w-full text-sm font-medium">Value</div>
                    <div className="text-subtle w-full text-sm font-medium">When to Write</div>
                  </div>
                  <Section.SubSectionNested>
                    <div className="flex gap-3">
                      <Input value="Customer Name" className="w-full" />
                      <Input value="Text" className="w-full" />
                      <Input value="John Doe" className="w-full" />
                      <Input value="On Create" className="w-full" />
                    </div>
                  </Section.SubSectionNested>
                </Section.SubSectionContent>
              )}
            </Section.SubSection>
          </Section.Content>
        )}
      </Section>
    </RenderComponentWithSnippet>
  );
};

export const SubSectionExampleSnippet = `
"use client";

import { useState } from "react";
import { Section } from "@calcom/ui/components/section";
import { Switch } from "@calcom/ui/components/form";

const SectionWithSubsections = () => {
  const [isMainOpen, setIsMainOpen] = useState(true);
  const [isFirstSubsectionOpen, setIsFirstSubsectionOpen] = useState(true);
  const [isSecondSubsectionOpen, setIsSecondSubsectionOpen] = useState(true);
  
  return (
     <Section>
        <Section.Header
          icon="calendar"
          title="Section with Subsections"
          description="This section contains nested subsections">
          <Switch size="sm" checked={isMainOpen} onCheckedChange={setIsMainOpen} />
        </Section.Header>
        {isMainOpen && (
          <Section.Content>
            <Section.SubSection>
              <Section.SubSectionHeader icon="zap" title="Automatic Sync (Justify Start)" justify="start">
                <Switch size="sm" />
              </Section.SubSectionHeader>
            </Section.SubSection>
            <Section.SubSection>
              <Section.SubSectionHeader icon="user" title="Create new records for guests added">
                <Switch
                  size="sm"
                  checked={isFirstSubsectionOpen}
                  onCheckedChange={setIsFirstSubsectionOpen}
                />
              </Section.SubSectionHeader>
              {isFirstSubsectionOpen && (
                <Section.SubSectionContent>
                  <p>This is the content of the first subsection.</p>
                </Section.SubSectionContent>
              )}
            </Section.SubSection>
            <Section.SubSection>
              <Section.SubSectionHeader icon="settings" title="Open Settings">
                <Switch
                  size="sm"
                  checked={isSecondSubsectionOpen}
                  onCheckedChange={setIsSecondSubsectionOpen}
                />
              </Section.SubSectionHeader>
              {isSecondSubsectionOpen && (
                <Section.SubSectionContent>
                  <div className="flex gap-3 px-3 py-1.5">
                    <div className="text-subtle w-full text-sm font-medium">Field Name</div>
                    <div className="text-subtle w-full text-sm font-medium">Field Type</div>
                    <div className="text-subtle w-full text-sm font-medium">Value</div>
                    <div className="text-subtle w-full text-sm font-medium">When to Write</div>
                  </div>
                  <Section.SubSectionNested>
                    <div className="flex gap-3">
                      <Input value="Customer Name" className="w-full" />
                      <Input value="Text" className="w-full" />
                      <Input value="John Doe" className="w-full" />
                      <Input value="On Create" className="w-full" />
                    </div>
                  </Section.SubSectionNested>
                </Section.SubSectionContent>
              )}
            </Section.SubSection>
          </Section.Content>
        )}
      </Section>
  );
};
`;
