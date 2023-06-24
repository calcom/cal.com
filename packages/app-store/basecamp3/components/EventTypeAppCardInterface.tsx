import { useState, useEffect } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { Select } from "@calcom/ui";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ eventType, app }) {
  const [getAppData, setAppData] = useAppContextWithSchema<typeof appDataSchema>();
  const isSunrise = getAppData("isSunrise");
  const [enabled, setEnabled] = useState(getAppData("enabled"));
  const [projects, setProjects] = useState(undefined);
  const [selectedProject, setSelectedProject] = useState(undefined);

  useEffect(() => {
    fetch("/api/integrations/basecamp3/projects")
      .then((resp) => resp.json())
      .then((json) => {
        console.log("jsoni", json);
        setSelectedProject({
          value: json?.currentProject,
          label: json?.data?.find((project) => project.id === json?.currentProject)?.name,
        });
        setProjects(
          json.data.map((project) => {
            return {
              value: project.id,
              label: project.name,
            };
          })
        );
      });
  }, []);

  console.log(selectedProject, "basecampProject");
  console.log(projects, "projects");
  return (
    <AppCard
      setAppData={setAppData}
      app={app}
      switchOnClick={(e) => {
        if (!e) {
          setEnabled(false);
          setAppData("isSunrise", false);
        } else {
          setEnabled(true);
          setAppData("isSunrise", true);
        }
      }}
      switchChecked={enabled}>
      <div className="mt-2 text-sm">
        {/* <div className="flex">Event with Title: {eventType.title}</div> */}
        <div className="flex gap-3">
          <div className="items-center">
            <p className="py-2">Link a Basecamp project to this event:</p>
          </div>
          <Select
            placeholder="Select project"
            options={projects}
            isLoading={!projects}
            className="md:min-w-[120px]"
            onChange={(project) => {
              fetch(`/api/integrations/basecamp3/projects?projectId=${project.value}`, {
                method: "POST",
              }).then((resp) => resp.json());
            }}
            // defaultValue={selectedProject}
          />
        </div>
        <div className="mt-2">
          Please note that as of now you can only link <span className="italic">one</span> of your projects to
          cal.com
        </div>
        {/* <div className="mt-2">
          Edit <span className="italic">packages/app-store/{app.slug}/EventTypeAppCardInterface.tsx</span> to
          play with me BASECAMP
        </div> */}
      </div>
    </AppCard>
  );
};

export default EventTypeAppCard;
