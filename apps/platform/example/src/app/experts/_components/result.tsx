"use client";
import Image from "next/image";
import { MoreHorizontal } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Expert } from "~/app/experts/page";
import { Separator } from "~/components/ui/separator";
import { relativeTime } from "~/lib/utils";

export default function ExpertList(props: { experts: Array<Expert> }) {
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
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead className="md:min-w-[200px]">Name</TableHead>
              <TableHead>Services</TableHead>
              <TableHead className="hidden md:table-cell">Profession</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead className="hidden md:table-cell">
                Available
              </TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.experts.map((result) => {
              const available = new Date(result.availableAt).getTime();
              return (
                <TableRow key={result.id}>
                  <TableCell className="hidden sm:table-cell">
                    <Image
                      alt={result.image.alt}
                      className="aspect-square rounded-md object-cover"
                      height="64"
                      src={result.image.url}
                      width="64"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{result.name}</TableCell>
                  <TableCell>
                    {result.services.map((service) => (
                      <Badge variant="outline">{service.name}</Badge>
                    ))}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {result.profession.name}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {result.location}
                  </TableCell>
                  <TableCell className="hidden md:table-cell" suppressHydrationWarning>
                    {relativeTime(available)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>1-10</strong> of <strong>32</strong> experts
        </div>
      </CardFooter>
    </Card>
  );
}
