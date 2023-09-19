import { useState, useEffect } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { trpc } from "@calcom/trpc/react";
import { Select } from "@calcom/ui";

import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app }) {
  const { getAppData } = useAppContextWithSchema<typeof appDataSchema>();
  const [enabled, setEnabled] = useState(getAppData("enabled"));
  const [projects, setProjects] = useState();
  const [selectedProject, setSelectedProject] = useState<undefined | { label: string; value: string }>();
  const { data } = trpc.viewer.appBasecamp3.projects.useQuery();
  const setProject = trpc.viewer.appBasecamp3.projectMutation.useMutation();
  useEffect(() => {
    setSelectedProject({
      value: data?.projects.currentProject,
      label: data?.projects?.find((project: any) => project.id === data?.currentProject)?.name,
    });
    setProjects(
      data?.projects?.map((project: any) => {
        return {
          value: project.id,
          label: project.name,
        };
      })
    );
  }, [data]);

  return (
    <AppCard
      app={app}
      switchOnClick={(e) => {
        if (!e) {
          setEnabled(false);
        } else {
          setEnabled(true);
        }
      }}
      switchChecked={enabled}>
      <div className="mt-2 text-sm">
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
              if (project) {
                setProject.mutate({ projectId: project?.value.toString() });
                setSelectedProject(project);
              }
            }}
            value={selectedProject}
          />
        </div>
        <div className="mt-2">
          Please note that as of now you can only link <span className="italic">one</span> of your projects to
          cal.com
        </div>
      </div>
    </AppCard>
  );
};

export default EventTypeAppCard;
