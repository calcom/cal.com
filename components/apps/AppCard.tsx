import { StarIcon } from "@heroicons/react/solid";

import Button from "@components/ui/Button";

export default function AppCard(props: any) {
  return (
    <div className="p-5 border border-gray-300 rounded-sm hover:bg-gray-200">
      <div className="flex">
        <img src={props.logo} alt={props.name + " Logo"} className="w-12 h-12 mb-2 rounded-sm" />
        <Button color="secondary" className="flex self-start ml-auto">
          Add
        </Button>
      </div>
      <h3 className="font-medium">{props.name}</h3>
      <div className="flex text-sm text-gray-800">
        {props.rating} stars <StarIcon className="w-4 h-4 ml-1 text-yellow-600 mt-0.5" />
      </div>
      <p className="text-sm text-gray-500">{props.description}</p>
    </div>
  );
}
