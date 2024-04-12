import Image from "next/image";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ExpertBooker } from "./_components/expert-booker";

import { getExperts } from "~/lib/experts";
import { useState } from "react";

export default async function ExpertDetails({
  params,
}: {
  params: { expertHandle: string };
}) {
  // TODO: replace w/ db call using params.expertHandle
  // const expert = await getExpertBySlug({slug: params.expertHandle});
  const expert = (
    await getExperts({ sortKey: "name", reverse: false, query: "" })
  ).find((expert) => expert.username === params.expertHandle);
  if (!expert) {
    return <div>Expert not found</div>;
  }

  return (
    <div className="grid flex-1 gap-4 overflow-auto p-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="relative hidden flex-col items-start gap-8 md:flex">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{expert.name}</CardTitle>
            <CardDescription>
              Lipsum dolor sit amet, consectetur adipiscing elit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Image
                alt="Expert image"
                className="aspect-square w-full rounded-md object-cover"
                height="300"
                src={expert.image.url}
                width="300"
              />
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <h3 className="font-semibold leading-none tracking-tight">
                    Location
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {expert.location}
                  </p>
                </div>
                <div className="flex flex-col space-y-1.5">
                  <h3 className="font-semibold leading-none tracking-tight">
                    Services
                  </h3>
                  <div className="flex gap-2">
                    {expert.services.map((service) => (
                      <Badge key={service.name}>{service.name}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="relative flex h-full min-h-[50vh] flex-col items-center justify-center rounded-xl bg-muted/50 p-4 lg:col-span-2">
        <ExpertBooker expert={expert} />
      </div>
    </div>
  );
}
