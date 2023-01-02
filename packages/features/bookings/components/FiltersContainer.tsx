import { Fragment, ReactNode } from "react";

import { PeopleFilter } from "./PeopleFilter";
import { TeamsMemberFilter } from "./TeamFilter";

type FilterTypes = "teams" | "people";

type Filter = {
  name: FilterTypes;
  controllingQueryParams?: string[]; // this is what the filter controls - but also we show the filter if any of these query params are present
  component: ReactNode;
  showByDefault?: boolean;
};

const filters: Filter[] = [
  {
    name: "teams",
    component: <TeamsMemberFilter />,
    controllingQueryParams: ["teamId"],
    showByDefault: true,
  },
  {
    name: "people",
    component: <PeopleFilter />,
    controllingQueryParams: ["usersId"],
    showByDefault: true,
  },
];

export function FiltersContainer() {
  return (
    <div className="flex w-full space-x-2 overflow-x-scroll lg:justify-end ">
      {filters.map((filter) => {
        if (!filter.showByDefault) {
          // TODO: check if any of the controllingQueryParams are present in the query params and show the filter if so
          // TODO: Also check state to see if the user has toggled the filter
          return null;
        }
        return <Fragment key={filter.name}>{filter.component}</Fragment>;
      })}
    </div>
  );
}
