import { StarIcon } from "@heroicons/react/solid";
import Link from "next/link";

import Button from "@components/ui/Button";

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
      <a className="block p-5 border border-gray-300 rounded-sm hover:bg-neutral-50">
        <div className="flex">
          <img src={props.logo} alt={props.name + " Logo"} className="w-12 h-12 mb-4 rounded-sm" />
          <Button
            color="secondary"
            className="flex self-start ml-auto"
            onClick={() => {
              // TODO: Actually add the integration
              console.log("The magic is supposed to happen here");
            }}>
            Add
          </Button>
        </div>
        <h3 className="font-medium">{props.name}</h3>
        <div className="flex text-sm text-gray-800">
          <span>{props.rating} stars</span> <StarIcon className="w-4 h-4 ml-1 text-yellow-600 mt-0.5" />
          <span className="pl-1 text-gray-500">{props.reviews} reviews</span>
        </div>
        <p className="mt-2 text-sm text-gray-500">{props.description}</p>
      </a>
    </Link>
  );
}
