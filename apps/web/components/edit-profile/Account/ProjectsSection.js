import RemoveButton from "@ui/fayaz/RemoveButton";
import React from "react";

import { Input, TextArea, Button } from "@calcom/ui";

import EmptyState from "./EmptyState";
import FormBlock from "./FormBlock";

const ProjectsSection = ({ profile, setProfile, addProject, removeProject }) => {
  return (
    <FormBlock title="Projects" description="Showcase your star projects.">
      {!profile?.projects?.length > 0 && <EmptyState label="Add some projects and get started." />}
      <div className="space-y-4 divide-y">
        {profile?.projects?.length > 0 &&
          profile.projects.map((project, i) => (
            <div key={i} className="space-y-4 pt-2">
              <div className="sm:col-span-3">
                <Input
                  label="Title"
                  value={project.title}
                  onChange={(e) => {
                    const newProjects = [...profile.projects];
                    newProjects[i].title = e.target.value;
                    setProfile({ ...profile, projects: newProjects });
                  }}
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  label="URL"
                  type="url"
                  value={project.url}
                  onChange={(e) => {
                    const newProjects = [...profile.projects];
                    newProjects[i].url = e.target.value;
                    setProfile({ ...profile, projects: newProjects });
                  }}
                />
              </div>
              <div className="col-span-full">
                <TextArea
                  label="Description"
                  value={project.description}
                  onChange={(e) => {
                    const newProjects = [...profile.projects];
                    newProjects[i].description = e.target.value;
                    setProfile({ ...profile, projects: newProjects });
                  }}
                />
              </div>
              <div className="col-span-full flex items-center justify-end">
                <RemoveButton label="Remove" onClick={() => removeProject(i)} />
              </div>
            </div>
          ))}
      </div>
      <div className="col-span-full mt-6">
        <Button onClick={addProject} type="button" size="sm" label="Add project" />
      </div>
    </FormBlock>
  );
};

export default ProjectsSection;
