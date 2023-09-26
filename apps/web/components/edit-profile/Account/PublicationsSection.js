import RemoveButton from "@ui/fayaz/RemoveButton";
import React from "react";

import { Input, TextArea, Button } from "@calcom/ui";

import EmptyState from "./EmptyState";
import FormBlock from "./FormBlock";

const PublicationsSection = ({ profile, setProfile, addPublication, removePublication }) => {
  return (
    <FormBlock
      title="Publications"
      description="Ever published something, a paper or a blog post? Add it here.">
      {!profile?.publications?.length > 0 && <EmptyState label="Add some publications and get started." />}
      <div className="space-y-4 divide-y">
        {profile?.publications?.length > 0 &&
          profile.publications.map((publication, i) => (
            <div key={i} className="space-y-4 pt-2">
              <div className="sm:col-span-3">
                <Input
                  label="Title"
                  value={publication.title}
                  onChange={(e) => {
                    const newPublicationss = [...profile.publications];
                    newPublicationss[i].title = e.target.value;
                    setProfile({ ...profile, publications: newPublicationss });
                  }}
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  label="URL"
                  type="url"
                  value={publication.url}
                  onChange={(e) => {
                    const newPublicationss = [...profile.publications];
                    newPublicationss[i].url = e.target.value;
                    setProfile({ ...profile, publications: newPublicationss });
                  }}
                />
              </div>
              <div className="col-span-full">
                <TextArea
                  label="Description"
                  value={publication.description}
                  onChange={(e) => {
                    const newPublicationss = [...profile.publications];
                    newPublicationss[i].description = e.target.value;
                    setProfile({ ...profile, publications: newPublicationss });
                  }}
                />
              </div>
              <div className="col-span-full flex items-center justify-end">
                <RemoveButton label="Remove" onClick={() => removePublication(i)} />
              </div>
            </div>
          ))}
      </div>
      <div className="col-span-full mt-6">
        <Button onClick={addPublication} type="button" size="sm" label="Add publication" />
      </div>
    </FormBlock>
  );
};

export default PublicationsSection;
