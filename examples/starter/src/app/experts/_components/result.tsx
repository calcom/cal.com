"use client";
import Image from "next/image";
import { ChevronRightIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";


import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Separator } from "~/components/ui/separator";
import { relativeTime } from "~/lib/utils";
import Link from "next/link";
import { type Profession, type Service, type User } from "@prisma/client";

export default function ExpertList(props: { experts: Array<User & {services: Service[] , professions: Profession[]}> }) {
  return (
    <Card className="border-none shadow-none">
      <CardHeader className="pb-10 text-center">
        {/* so that we place the Separator visually behind the CardTitle */}
        <div className="relative w-full">
          <div
            className="absolute inset-0 flex items-center"
            aria-hidden="true"
          >
            <Separator orientation="horizontal" />
          </div>
          <div className="relative flex justify-center">
            <CardTitle className="bg-background px-4">Results</CardTitle>
          </div>
        </div>
        <CardDescription>Book your expert now.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-none">
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead className="md:min-w-[200px]">Name</TableHead>
              <TableHead>Services</TableHead>
              <TableHead className="hidden md:table-cell">Profession</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead className="hidden md:table-cell">Available</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.experts.map((result) => {
              const available = new Date().getTime();
              return (
                <TableRow key={result.id}>
                  <TableCell className="hidden sm:table-cell">
                    <Link href={`/experts/${result.username}`}>
                      <Image
                        alt={""}
                        className="aspect-square rounded-md object-cover"
                        height="64"
                        src="https://picsum.photos/200"
                        width="64"
                      />
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium"><Link href={`/experts/${result.username}`}>{result.name}</Link></TableCell>
                  <TableCell className="space-x-1 space-y-1">
                    {result.services.map((service, idx) => (
                      <Badge key={idx}>{service.name}</Badge>
                    ))}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {result.professions?.[0]?.name ?? "Hair Dresser"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    Everywhere
                  </TableCell>
                  <TableCell
                    className="hidden md:table-cell"
                    suppressHydrationWarning
                  >
                    {relativeTime(available)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/experts/${result.username}`}>
                    <ChevronRightIcon
                      className="h-5 w-5 flex-none"
                      aria-hidden="true"
                    />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>{props.experts.length}</strong> experts
        </div>
      </CardFooter>
    </Card>
  );
}
