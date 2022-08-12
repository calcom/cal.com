import Link from "next/link";
import { useEffect, useState } from "react";

import { trpc } from "@calcom/trpc/react";
import { App as AppType } from "@calcom/types/App";
import { Button, SkeletonButton } from "@calcom/ui";
import Badge from "@calcom/ui/Badge";

interface AppCardProps {
  logo: string;
  name: string;
  type: AppType["type"];
  slug?: string;
  category?: string;
  description: string;
  rating: number;
  reviews?: number;
  isProOnly?: boolean;
  categories: string[];
}

export default function AppCard(props: AppCardProps) {
  const { data: user } = trpc.useQuery(["viewer.me"]);
  // console.log("APP", props);
  const [installedAppCount, setInstalledAppCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    async function getInstalledApp(appCredentialType: string) {
      const queryParam = new URLSearchParams();
      queryParam.set("app-credential-type", appCredentialType);
      try {
        const result = await fetch(`/api/app-store/installed?${queryParam.toString()}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }).then((data) => {
          setIsLoading(false);
          return data;
        });
        if (result.status === 200) {
          const res = await result.json();
          setInstalledAppCount(res.count);
        }
      } catch (error) {
        if (error instanceof Error) {
          console.log(error.message);
        }
      }
    }
    getInstalledApp(props.type);
  }, [props.type]);

  return (
    <Link href={"/apps/" + props.slug}>
      <a
        className="block h-full rounded-sm border border-gray-300 p-5 hover:bg-neutral-50"
        data-testid={`app-store-app-card-${props.slug}`}>
        <div className="flex justify-between">
          {
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.logo} alt={props.name + " Logo"} className="mb-4 h-12 w-12 rounded-sm" />
          }
          {!isLoading ? (
            installedAppCount > 0 ? (
              <Button
                color="secondary"
                className="ml-auto flex self-start"
                onClick={() => {
                  console.log("The magic is supposed to happen here");
                }}>
                Installed
              </Button>
            ) : (
              <Button
                color="secondary"
                className="ml-auto flex self-start"
                onClick={() => {
                  console.log("The magic is supposed to happen here");
                }}>
                Add
              </Button>
            )
          ) : (
            <SkeletonButton width="10" height="10" />
          )}
        </div>
        <div className="flex items-center">
          <h3 className="font-medium">{props.name}</h3>
          {props.isProOnly && user?.plan === "FREE" ? (
            <Badge className="ml-2" variant="default">
              PRO
            </Badge>
          ) : null}
        </div>
        {/* TODO: add reviews <div className="flex text-sm text-gray-800">
          <span>{props.rating} stars</span> <StarIcon className="ml-1 mt-0.5 h-4 w-4 text-yellow-600" />
          <span className="pl-1 text-gray-500">{props.reviews} reviews</span>
        </div> */}
        <p className="mt-2 truncate text-sm text-gray-500">{props.description}</p>
      </a>
    </Link>
  );
}
