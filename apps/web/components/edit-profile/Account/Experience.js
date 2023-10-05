import { Input, Button, Label } from "@shadcdn/ui";
import RemoveButton from "@ui/fayaz/RemoveButton";
import React from "react";

import EmptyState from "./EmptyState";
import FormBlock from "./FormBlock";
import TimelineBlock from "./TimelineBlock";

const Experience = ({ profile, setProfile, addExperience, removeExperience, removeExperienceRole }) => {
  return (
    <FormBlock title="Experience" description="Your work experience.">
      {!profile?.experience?.length > 0 && <EmptyState label="Add some roles and get started." />}
      <div className="space-y-4 divide-y">
        {profile?.experience?.length > 0 &&
          profile.experience.map((company, companyIndex) => (
            <div key={companyIndex} className="relative space-y-4 pt-4">
              {profile.experience.length > 1 && (
                <RemoveButton
                  label="Remove company"
                  onClick={() => removeExperience(companyIndex)}
                  className="absolute right-0 top-7 z-30"
                />
              )}
              <div className="sm:col-span-3">
                <Label>Company/Institution</Label>
                <Input
                  value={company.company}
                  onChange={(e) => {
                    const newExperience = [...profile.experience];
                    newExperience[companyIndex].company = e.target.value;
                    setProfile({
                      ...profile,
                      experience: newExperience,
                    });
                  }}
                />
              </div>
              <div className="sm:col-span-3">
                <Label>URL</Label>
                <Input
                  label="URL"
                  type="url"
                  value={company.url}
                  onChange={(e) => {
                    const newExperience = [...profile.experience];
                    newExperience[companyIndex].url = e.target.value;
                    setProfile({
                      ...profile,
                      experience: newExperience,
                    });
                  }}
                />
              </div>

              {company.roles.map((role, roleIndex) => (
                <div key={roleIndex} className="relative">
                  {company.roles.length > 1 && (
                    <RemoveButton
                      label="Remove role"
                      onClick={() => removeExperienceRole(companyIndex, roleIndex)}
                      className="absolute -top-px right-0 z-30"
                    />
                  )}
                  <TimelineBlock trail={true}>
                    <div className="sm:col-span-3">
                      <Label>Role/Title</Label>
                      <Input
                        label="Role/Title"
                        value={role.title}
                        onChange={(e) => {
                          const newExperience = [...profile.experience];
                          newExperience[companyIndex].roles[roleIndex].title = e.target.value;
                          setProfile({
                            ...profile,
                            experience: newExperience,
                          });
                        }}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Label>Start Date</Label>
                      <Input
                        type="month"
                        required
                        value={role.start_date}
                        onChange={(e) => {
                          const newExperience = [...profile.experience];
                          newExperience[companyIndex].roles[roleIndex].start_date = e.target.value;
                          setProfile({
                            ...profile,
                            experience: newExperience,
                          });
                        }}
                      />
                    </div>
                    <div className="mt-4 sm:col-span-3">
                      <Label>End Date</Label>
                      <Input
                        label="End Date"
                        type={role.end_date === "Present" ? "text" : "month"}
                        value={role.end_date}
                        required
                        onChange={(e) => {
                          const newExperience = [...profile.experience];
                          newExperience[companyIndex].roles[roleIndex].end_date = e.target.value;
                          setProfile({
                            ...profile,
                            experience: newExperience,
                          });
                        }}
                        disabled={role.end_date === "Present"}
                      />
                      <label className="mt-1 inline-flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                          defaultChecked={role.end_date === "Present"}
                          onChange={(e) => {
                            const newExperience = [...profile.experience];
                            if (e.target.checked) {
                              newExperience[companyIndex].roles[roleIndex].end_date = "Present";
                            } else {
                              newExperience[companyIndex].roles[roleIndex].end_date = "";
                            }
                            setProfile({
                              ...profile,
                              experience: newExperience,
                            });
                          }}
                        />
                        <span className="ml-2 text-sm">I currently work here</span>
                      </label>
                    </div>
                  </TimelineBlock>
                </div>
              ))}
              <TimelineBlock trail={false}>
                <div className="col-span-full">
                  <Button
                    onClick={() => {
                      const newExperience = [...profile.experience];
                      newExperience[companyIndex].roles.push({
                        title: "",
                        description: "",
                        start_date: "",
                        end_date: "",
                      });
                      setProfile({
                        ...profile,
                        experience: newExperience,
                      });
                    }}
                    variant="outline"
                    size="sm">
                    Add Role
                  </Button>
                </div>
              </TimelineBlock>
            </div>
          ))}
      </div>
      <div className="col-span-full mt-6">
        <Button onClick={addExperience} variant="outline" size="sm">
          Add experience
        </Button>
      </div>
    </FormBlock>
  );
};

export default Experience;
