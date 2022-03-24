import { StarIcon } from "@heroicons/react/solid";
import Link from "next/link";

import Button from "@calcom/ui/Button";

interface AppCardProps {
  logo: string;
  name: string;
  slug?: string;
  category?: string;
  description: string;
  rating: number;
  reviews?: number;
}

export default function AppCard(props: AppCardProps) {
  return (
    <Link href={"/apps/" + props.slug}>
      <a className="block h-full rounded-sm border border-gray-300 p-5 hover:bg-neutral-50">
        <div className="flex">
          <img src={props.logo} alt={props.name + " Logo"} className="mb-4 h-12 w-12 rounded-sm" />
          <Button
            color="secondary"
            className="ml-auto flex self-start"
            onClick={() => {
              console.log("The magic is supposed to happen here");
            }}>
            Add
          </Button>
        </div>
        <h3 className="font-medium">{props.name}</h3>
        {/* TODO: add reviews <div className="flex text-sm text-gray-800">
          <span>{props.rating} stars</span> <StarIcon className="ml-1 mt-0.5 h-4 w-4 text-yellow-600" />
          <span className="pl-1 text-gray-500">{props.reviews} reviews</span>
        </div> */}
        <p className="mt-2 truncate text-sm text-gray-500">{props.description}</p>
      </a>
    </Link>
  );
}
