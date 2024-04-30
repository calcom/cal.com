"use client";
import { GcalConnect } from "@calcom/atoms";
import { Loader } from "lucide-react";
import { Suspense } from "react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export default function GettingStarted() {
  return (
    <main className="flex-1">
      <div className="flex items-center justify-center p-10">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Getting Started</CardTitle>
            <CardDescription>
              Connect your calendar to get started.
            </CardDescription>
          </CardHeader>
          <CardFooter className="[&>div]:w-full">
            <Suspense
            fallback={
              <div className="relative h-max w-full max-w-sm place-self-center">
                <div className=" absolute inset-0 z-40  grid rounded-2xl bg-slate-900 text-white">
                  <Loader className="z-50 animate-spin place-self-center" />
                </div>
              </div>
            }>
              <GcalConnect className="flex justify-center items-center w-full [&>svg]:mr-2"/>
            </Suspense>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
};

