import { trpc } from "@calcom/trpc";

export const WorkflowsBlock = () => {
  const {
    data: timeCapsule,
    isSuccess,
    isLoading,
  } = trpc.viewer.timeCapsule.workflows.useQuery(undefined, {
    staleTime: 30000,
    trpc: {
      context: { skipBatch: true },
    },
    enabled: true,
  });

  if (isLoading || !isSuccess) return null;

  return (
    <>
      <h1 className="font-cal text-emphasis mt-2 text-5xl font-extrabold sm:text-5xl">
        You created
        <strong className="text-blue-500"> {timeCapsule.totalWorkflows} </strong> workflows
      </h1>
    </>
  );
};
