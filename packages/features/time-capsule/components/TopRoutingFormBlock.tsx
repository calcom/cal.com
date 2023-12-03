import { trpc } from "@calcom/trpc";

export const TopRoutingFormBlock = () => {
  const {
    data: timeCapsule,
    isSuccess,
    isLoading,
  } = trpc.viewer.timeCapsule.routingForms.useQuery(undefined, {
    staleTime: 30000,
    trpc: {
      context: { skipBatch: true },
    },
    enabled: true,
  });

  if (isLoading || !isSuccess) return null;

  return (
    <>
      <h1 className="font-cal text-emphasis mt-2 text-4xl font-extrabold sm:text-4xl">
        Your top routing form was <strong className="text-blue-500">{timeCapsule.topRoutingForm[0]} </strong>{" "}
        <br /> with <strong className="text-blue-500">{timeCapsule.topRoutingForm[1]} </strong> responses
      </h1>
    </>
  );
};
