import Image from "next/image";
import { Badge } from "~/components/ui/badge";


import { ExpertBooker } from "./_components/expert-booker";

import { db } from "prisma/client";

export default async function ExpertDetails({
  params,
}: {
  params: { expertHandle: string };
}) {
  // TODO: replace w/ db call using params.expertHandle
  // const expert = await getExpertBySlug({slug: params.expertHandle});

  const expert = await db.user.findUnique({
    where: { username: params.expertHandle },
    include: { calAccount: true, services: true, professions: true },
  });
  if (!expert) {
    return <div>Expert not found</div>;
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-4 overflow-auto">
      <div className="flex w-full justify-between rounded-md bg-muted/50 px-8 py-4 sm:px-10 lg:px-12">
        <div className="flex items-center gap-x-6">
          <Image
            alt="Expert image"
            className="aspect-square rounded-md object-cover"
            src="https://picsum.photos/200"
            height="64"
            width="64"
          />
          <div>
            <div className="text-sm leading-6 text-muted-foreground">
              {expert?.professions.map((profession) => profession.name).join(", ")}
            </div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">
              {expert?.name}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-x-4 sm:gap-x-6">
        <div className="flex flex-col space-y-1.5 p-6">
            <div className="text-sm leading-6 text-muted-foreground">
              Professions
            </div>
            <div className="flex gap-1">
              {expert.professions.slice(0, 2).map((profession, idx) => (
                <Badge key={idx}>{profession.name}</Badge>
              ))}
              {expert.professions.length > 2 && (
                <Badge>+{expert.professions.length - 2} more</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col space-y-1.5 p-6">
            <div className="text-sm leading-6 text-muted-foreground">
              Services
            </div>
            <div className="flex gap-1">
              {expert.services.slice(0, 2).map((service, idx) => (
                <Badge key={idx}>{service.name}</Badge>
              ))}
              {expert.services.length > 2 && (
                <Badge>+{expert.services.length - 2} more</Badge>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-4 grid w-full gap-2 px-8 sm:px-10 lg:px-12">
        <h2 className="text-3xl font-semibold">Availability</h2>
      </div>
      <div className="border-subtle mx-8 mt-12 flex aspect-[2.5/1] flex-col-reverse items-center overflow-x-clip rounded-2xl border bg-muted pb-6 pl-6 pt-6 shadow-sm max-md:pr-6 sm:mx-10 md:grid md:grid-cols-[minmax(440px,1fr)_minmax(0,2.5fr)] lg:mx-12">
        <div className="md:min-w-[96vw] [&_.calcom-atoms]:bg-[transparent]">
          {Boolean(expert.calAccount) && <ExpertBooker calAccount={expert.calAccount!} expert={expert}/>}
        </div>
      </div>
    </div>
  );
}
