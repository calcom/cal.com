import { Input, TextArea, Button } from "@shadcdn/ui";
import RemoveButton from "@ui/fayaz/RemoveButton";
import React from "react";

import EmptyState from "./EmptyState";
import FormBlock from "./FormBlock";

const FactsSection = ({ profile, setProfile, addFact, removeFact }) => {
  return (
    <FormBlock title="Facts" description="Highlights on what makes you you.">
      {!profile?.facts?.length > 0 && <EmptyState label="Add some facts and get started." />}
      <div className="space-y-8 divide-y">
        {profile?.facts?.length > 0 &&
          profile.facts.map((fact, i) => (
            <div key={i} className="space-y-4 pt-4">
              <div className="sm:col-span-3">
                <Input
                  label="Title"
                  value={fact.title}
                  onChange={(e) => {
                    const newFacts = [...profile.facts];
                    newFacts[i].title = e.target.value;
                    setProfile({ ...profile, facts: newFacts });
                  }}
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  label="URL"
                  type="url"
                  value={fact.url}
                  onChange={(e) => {
                    const newFacts = [...profile.facts];
                    newFacts[i].url = e.target.value;
                    setProfile({ ...profile, facts: newFacts });
                  }}
                />
              </div>
              <div className="col-span-full">
                <TextArea
                  label="Description"
                  value={fact.description}
                  onChange={(e) => {
                    const newFacts = [...profile.facts];
                    newFacts[i].description = e.target.value;
                    setProfile({ ...profile, facts: newFacts });
                  }}
                />
              </div>
              <div className="col-span-full flex items-center justify-end">
                <RemoveButton label="Remove" onClick={() => removeFact(i)} />
              </div>
            </div>
          ))}
      </div>
      <div className="col-span-full mt-6">
        <Button onClick={addFact} size="sm" variant="outline">
          Add fact
        </Button>
      </div>
    </FormBlock>
  );
};

export default FactsSection;
