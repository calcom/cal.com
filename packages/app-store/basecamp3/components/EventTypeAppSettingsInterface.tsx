import { useState, useEffect } from "react";

import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import { trpc } from "@calcom/trpc/react";
import { Select } from "@calcom/ui";

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({}) => {
  const [projects, setProjects] = useState();
  const [selectedProject, setSelectedProject] = useState<undefined | { label: string; value: string }>();
  const { data } = trpc.viewer.appBasecamp3.projects.useQuery();
  const setProject = trpc.viewer.appBasecamp3.projectMutation.useMutation();

  useEffect(
    function refactorMeWithoutEffect() {
      setSelectedProject({
        value: data?.projects.currentProject,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        label: data?.projects?.find((project: any) => project.id === data?.currentProject)?.name,
      });
      setProjects(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data?.projects?.map((project: any) => {
          return {
            value: project.id,
            label: project.name,
          };
        })
      );
    },
    [data]
  );

  return (
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
  );
};

export default EventTypeAppSettingsInterface;
