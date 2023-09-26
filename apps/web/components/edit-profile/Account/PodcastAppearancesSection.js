import RemoveButton from "@ui/fayaz/RemoveButton";
import React from "react";

import { Button, Input } from "@calcom/ui";

import EmptyState from "./EmptyState";
import FormBlock from "./FormBlock";

const PodcastAppearancesSection = ({
  profile,
  setProfile,
  addPodcastAppearance,
  removePodcastAppearance,
}) => {
  return (
    <FormBlock title="Podcasts appearences" description="Add links to podcasts where you have appeared.">
      {!profile?.appearances?.length > 0 && <EmptyState label="To add a appearence click below" />}
      <div className="space-y-4 divide-y">
        {profile?.appearances?.length > 0 &&
          profile.appearances.map((appearance, i) => (
            <div key={i} className="space-y-4 pt-4">
              <div className="col-span-full">
                <Input
                  label="Title"
                  value={appearance.title}
                  onChange={(e) => {
                    const newAppearances = [...profile.appearances];
                    newAppearances[i].title = e.target.value;
                    setProfile({
                      ...profile,
                      appearances: newAppearances,
                    });
                  }}
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  label="URL"
                  type="url"
                  value={appearance.url}
                  onChange={(e) => {
                    const newAppearances = [...profile.appearances];
                    newAppearances[i].url = e.target.value;
                    setProfile({
                      ...profile,
                      appearances: newAppearances,
                    });
                  }}
                />
              </div>
              <div className="col-span-full flex items-center justify-end">
                <RemoveButton label="Remove" onClick={() => removePodcastAppearance(i)} />
              </div>
            </div>
          ))}
      </div>
      <div className="col-span-full mt-6">
        <Button onClick={() => addPodcastAppearance()} type="button" size="sm" label="Add appearence" />
      </div>
    </FormBlock>
  );
};

export default PodcastAppearancesSection;
