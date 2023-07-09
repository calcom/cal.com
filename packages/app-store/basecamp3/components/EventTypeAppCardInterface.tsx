import { useState, useEffect } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { Select } from "@calcom/ui";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app }) {
  const [getAppData, setAppData] = useAppContextWithSchema<typeof appDataSchema>();

  const [projects, setProjects] = useState();
  const [selectedProject, setSelectedProject] = useState<undefined | { label: string; value: string }>();

  useEffect(() => {
    fetch("/api/integrations/basecamp3/projects")
      .then((resp) => resp.json())
      .then((json) => {
        setSelectedProject({
          value: json?.currentProject,
          label: json?.data?.find((project: any) => project.id === json?.currentProject)?.name,
        });
        setProjects(
          json.data.map((project: any) => {
            return {
              value: project.id,
              label: project.name,
            };
          })
        );
      });
  }, []);

  return (
    <AppCard setAppData={setAppData} app={app}>
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
              fetch(`/api/integrations/basecamp3/projects?projectId=${project?.value}`, {
                method: "POST",
              }).then((resp) => resp.json());
            }}
            value={selectedProject}
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
