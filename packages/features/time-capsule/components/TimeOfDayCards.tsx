import { Grid } from "@tremor/react";

import { trpc } from "@calcom/trpc";

import { TimeOfDayCard } from "./TimeOfDayCard";

export const TimeOfDayCards = () => {
  const categories: {
    title: string;
    index: "Early Morning" | "Afternoon" | "Night" | "Nocturnal";
  }[] = [
    {
      title: "Early Morning (5:00AM - 11:00AM)",
      index: "Early Morning",
    },
    {
      title: "Afternoon (11:00AM - 5:00PM)",
      index: "Afternoon",
    },
    {
      title: "Night (5:00PM - 11:00PM)",
      index: "Night",
    },
    {
      title: "Nocturnal (11:00PM - 5:00AM)",
      index: "Nocturnal",
    },
  ];

  const {
    data: timeCapsule,
    isSuccess,
    isLoading,
  } = trpc.viewer.timeCapsule.calendar.useQuery(undefined, {
    staleTime: 30000,
    trpc: {
      context: { skipBatch: true },
    },
    enabled: true,
  });

  if (isLoading || !isSuccess) return null;
  //   if (isLoading) {
  //     return <LoadingKPICards categories={categories} />;
  //   }

  //   if (!isSuccess || !startDate || !endDate || (!teamId && !selectedUserId)) return null;

  return (
    <>
      <h1 className="font-cal text-emphasis mt-2 text-5xl font-extrabold sm:text-5xl">
        Your favorite time to meet was{" "}
        <strong className="text-blue-500">{timeCapsule.topTimeOfDay[0]}</strong>
      </h1>
      <div className="mb-4 space-y-4">
        <Grid numColsSm={2} numColsLg={2} className="mt-4 gap-x-4 gap-y-4">
          {categories.map((item) => (
            <TimeOfDayCard key={item.title} title={item.title} value={timeCapsule.hoursOfDay[item.index]} />
          ))}
        </Grid>
      </div>
    </>
  );
};

// const LoadingKPICards = (props: { categories: { title: string; index: string }[] }) => {
//   const { categories } = props;
//   return (
//     <Grid numColsSm={2} numColsLg={4} className="gap-x-4 gap-y-4">
//       {categories.map((item) => (
//         <CardInsights key={item.title}>
//           <SkeletonContainer className="flex w-full flex-col">
//             <SkeletonText className="mt-2 h-4 w-32" />
//             <SkeletonText className="mt-2 h-6 w-16" />
//             <SkeletonText className="mt-4 h-6 w-44" />
//           </SkeletonContainer>
//         </CardInsights>
//       ))}
//     </Grid>
//   );
// };
