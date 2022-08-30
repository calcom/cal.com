import { InstallAppButton } from "@calcom/app-store/components";
import { trpc } from "@calcom/trpc/react";
import { App } from "@calcom/types/App";
import Badge from "@calcom/ui/Badge";
import Button from "@calcom/ui/v2/core/Button";

interface AppCardProps {
  app: App;
}

export default function AppCard(props: AppCardProps) {
  const { data: user } = trpc.useQuery(["viewer.me"]);
  return (
    <div
      className="flex h-64 flex-col rounded-md border border-gray-300 p-5"
      data-testid={`app-store-app-card-${props.app.slug}`}>
      <div className="flex">
        {
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.app.logo} alt={props.app.name + " Logo"} className="mb-4 h-12 w-12 rounded-sm" />
        }
      </div>
      <div className="flex items-center">
        <h3 className="font-medium">{props.app.name}</h3>
        {props.app.isProOnly && user?.plan === "FREE" ? (
          <Badge className="ml-2" variant="default">
            PRO
          </Badge>
        ) : null}
      </div>
      {/* TODO: add reviews <div className="flex text-sm text-gray-800">
          <span>{props.rating} stars</span> <StarIcon className="ml-1 mt-0.5 h-4 w-4 text-yellow-600" />
          <span className="pl-1 text-gray-500">{props.reviews} reviews</span>
        </div> */}
      <p
        className="mt-2 flex-grow text-sm text-gray-500"
        style={{
          overflow: "hidden",
          display: "-webkit-box",
          "-webkit-box-orient": "vertical",
          "-webkit-line-clamp": "3",
        }}>
        {props.app.description}
      </p>
      <div className="mt-5 flex w-full space-x-2">
        <Button
          color="secondary"
          className="ml-auto flex w-3/4 justify-center"
          href={"/apps/" + props.app.slug}>
          Details
        </Button>
        <InstallAppButton
          type={props.app.type}
          render={(installProps) => {
            return (
              <Button
                {...installProps}
                onClick={() => null}
                color="secondary"
                className="ml-auto flex w-1/4 justify-center">
                Add
              </Button>
            );
          }}
        />
      </div>
    </div>
  );
}
