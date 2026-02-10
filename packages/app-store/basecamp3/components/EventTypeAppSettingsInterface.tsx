import { useState, useEffect, useMemo } from "react";

import type { EventTypeAppSettingsComponent } from "@calcom/app-store/types";
import { trpc } from "@calcom/trpc/react";
import { Select } from "@calcom/ui/components/form";

const EventTypeAppSettingsInterface: EventTypeAppSettingsComponent = ({}) => {
  const [selectedProject, setSelectedProject] = useState<undefined | { label: string; value: string }>();
  const { data, isLoading: isQueryLoading, isError } = trpc.viewer.appBasecamp3.projects.useQuery();
  const setProject = trpc.viewer.appBasecamp3.projectMutation.useMutation();

  const projectOptions = useMemo(() => {
    if (!data?.projects || !Array.isArray(data.projects)) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.projects.map((project: any) => ({
      value: String(project.id),
      label: project.name ?? String(project.id),
    }));
  }, [data?.projects]);

  useEffect(() => {
    if (!data) return;
    const current = data.currentProject ?? undefined;
    if (current === undefined || current === null) {
      setSelectedProject(undefined);
      return;
    }
    const currentId = String(current);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = data.projects?.find((p: any) => String(p.id) === currentId);
    setSelectedProject(found ? { value: currentId, label: found.name ?? currentId } : undefined);
  }, [data]);

  return (
    <div className="mt-2 text-sm">
      <div className="flex gap-3">
        <div className="items-center">
          <p className="py-2">Link a Basecamp project to this event:</p>
        </div>
        <Select
          placeholder="Select project"
          options={projectOptions}
          isLoading={isQueryLoading}
          className="md:min-w-[120px]"
          onChange={(project) => {
            if (project) {
              setProject.mutate({ projectId: project.value });
              setSelectedProject(project);
            }
          }}
          value={selectedProject}
        />
      </div>
      <div className="mt-2">
        {isError ? (
          <p className="text-red-600 dark:text-red-400">Unable to load projects. Please try again later.</p>
        ) : (
          <>
            Please note that as of now you can only link <span className="italic">one</span> of your projects
            to Cal ID
          </>
        )}
      </div>
    </div>
  );
};

export default EventTypeAppSettingsInterface;
