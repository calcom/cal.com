"use client";
import { GcalConnect } from "@calcom/atoms";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export const GettingStarted = () => {
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
            <GcalConnect className="flex justify-center items-center w-full [&>svg]:mr-2"/>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
};
export default GettingStarted;
