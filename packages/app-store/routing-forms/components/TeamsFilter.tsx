import { useSession } from "next-auth/react";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { queryNumberArray, useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar } from "@calcom/ui";
import { Layers, User } from "@calcom/ui/components/icon";

export type IEventTypesFilters = RouterOutputs["viewer"]["eventTypes"]["listWithTeam"];
export type IEventTypeFilter = IEventTypesFilters[0];

// TODO: Move this to zod utils
export const filterQuerySchema = z.object({
  teamIds: queryNumberArray.optional(),
  userIds: queryNumberArray.optional(),
});

export function useFilterQuery() {
  // passthrough allows additional params to not be removed
  return useTypedQuery(filterQuerySchema.passthrough());
}

// export const TeamsFilter = () => {
//   const { t } = useLocale();
//   const session = useSession();
//   const { data: query, pushItemToKey, removeItemByKeyAndValue, removeAllQueryParams } = useFilterQuery();
//   const { data: teams, status } = trpc.viewer.teams.list.useQuery();

//   const allFilterNames = Object.keys(filterQuerySchema.shape);

//   const isFilterThere = () => {
//     return allFilterNames.some((filterName) => query[filterName]);
//   };

//   const getCheckedOptionsNames = () => {
//     if (!isFilterThere()) {
//       return t("all");
//     }
//     const checkedOptions: string[] = [];
//     if (query.userIds) {
//       checkedOptions.push(t("yours"));
//     }
//     const teamIds = query.teamIds;
//     if (teamIds) {
//       const selectedTeamsNames = teams
//         ?.filter((team) => {
//           return teamIds.includes(team.id);
//         })
//         ?.map((team) => team.name);
//       if (selectedTeamsNames) {
//         checkedOptions.push(...selectedTeamsNames);
//       }
//     }
//     return checkedOptions.join(",");
//   };

//   const [dropdownTitle, setDropdownTitle] = useState<string>(getCheckedOptionsNames());
//   const isNotEmpty = !!teams?.length;

//   return status === "success" ? (
//     <AnimatedPopover text={dropdownTitle} popoverTriggerClassNames="mb-0">
//       <CheckboxFieldContainer>
//         <CheckboxField
//           icon={<Layers className="h-4 w-4" />}
//           checked={!isFilterThere()}
//           onChange={(e) => {
//             removeAllQueryParams();
//             setDropdownTitle(t("all"));
//           }}
//           label={t("all")}
//         />
//       </CheckboxFieldContainer>
//       <CheckboxFieldContainer>
//         <CheckboxField
//           icon={<User className="h-4 w-4" />}
//           checked={query.userIds?.includes(session.data?.user.id || 0)}
//           onChange={(e) => {
//             setDropdownTitle(t("yours"));
//             if (e.target.checked) {
//               pushItemToKey("userIds", session.data?.user.id || 0);
//             } else if (!e.target.checked) {
//               removeItemByKeyAndValue("userIds", session.data?.user.id || 0);
//             }
//           }}
//           label={t("yours")}
//         />
//       </CheckboxFieldContainer>

//       {isNotEmpty && (
//         <Fragment>
//           <div className="text-subtle px-4 py-2.5 text-xs font-medium uppercase leading-none">TEAMS</div>
//           {teams?.map((team) => (
//             <CheckboxFieldContainer key={team.id}>
//               <CheckboxField
//                 id={team.name}
//                 label={team.name}
//                 icon={
//                   <Avatar
//                     alt={team?.name}
//                     imageSrc={getPlaceholderAvatar(team.logo, team?.name as string)}
//                     size="xs"
//                   />
//                 }
//                 checked={query.teamIds?.includes(team.id)}
//                 onChange={(e) => {
//                   setDropdownTitle(team.name);
//                   if (e.target.checked) {
//                     pushItemToKey("teamIds", team.id);
//                   } else if (!e.target.checked) {
//                     removeItemByKeyAndValue("teamIds", team.id);
//                   }
//                 }}
//               />
//             </CheckboxFieldContainer>
//           ))}
//         </Fragment>
//       )}
//     </AnimatedPopover>
//   ) : null;
// };

// type Props = InputHTMLAttributes<HTMLInputElement> & {
//   label: string;
//   icon: ReactNode;
// };

// const CheckboxField = forwardRef<HTMLInputElement, Props>(({ label, icon, ...rest }, ref) => {
//   return (
//     <label className="flex w-full items-center justify-between">
//       <div className="flex items-center">
//         <div className="text-default flex h-6 w-6 items-center justify-center ltr:mr-2 rtl:ml-2">{icon}</div>
//         <span className="text-sm">{label}</span>
//       </div>
//       <div className="flex h-5 items-center">
//         <input
//           {...rest}
//           ref={ref}
//           type="checkbox"
//           className="text-primary-600 focus:ring-primary-500 border-default bg-default h-4 w-4 rounded hover:cursor-pointer"
//         />
//       </div>
//     </label>
//   );
// });

// const CheckboxFieldContainer = ({ children }: { children: ReactNode }) => {
//   return <div className="flex items-center px-3 py-2">{children}</div>;
// };

// CheckboxField.displayName = "CheckboxField";
export const TeamsFilter = () => {
  const { t } = useLocale();
  const session = useSession();
  const {
    data: query,
    pushItemToKey,
    removeItemByKeyAndValue,
    removeByKey,
    removeAllQueryParams,
  } = useFilterQuery();
  const { data: teams } = trpc.viewer.teams.list.useQuery();
  const getCheckedOptionsNames = () => {
    const checkedOptions: string[] = [];
    const teamIds = query.teamIds;
    if (teamIds) {
      const selectedTeamsNames = teams
        ?.filter((team) => {
          return teamIds.includes(team.id);
        })
        ?.map((team) => team.name);
      if (selectedTeamsNames) {
        checkedOptions.push(...selectedTeamsNames);
      }
      return checkedOptions.join(",");
    }
    if (query.userIds) {
      return t("yours");
    }
    return t("all");
  };

  if (!teams || !teams.length) return null;

  return (
    <AnimatedPopover text={getCheckedOptionsNames()}>
      <div className="item-center focus-within:bg-subtle hover:bg-muted flex px-4 py-[6px] hover:cursor-pointer">
        <div className="text-default flex h-6 w-6 items-center justify-center ltr:mr-2 rtl:ml-2">
          <Layers className="h-5 w-5" />
        </div>
        <label htmlFor="all" className="text-default mr-auto self-center truncate text-sm font-medium">
          {t("all")}
        </label>

        <input
          id="all"
          type="checkbox"
          checked={!query.teamIds && !query.userIds?.includes(session.data?.user.id || 0)}
          onChange={() => {
            removeAllQueryParams();
          }}
          className="text-primary-600 focus:ring-primary-500 border-default inline-flex h-4 w-4 place-self-center justify-self-end rounded "
        />
      </div>
      <div className="item-center focus-within:bg-subtle hover:bg-muted flex px-4 py-[6px] hover:cursor-pointer">
        <div className="text-default flex h-6 w-6 items-center justify-center ltr:mr-2 rtl:ml-2">
          <User className="h-5 w-5" />
        </div>
        <label htmlFor="yours" className="text-default mr-auto self-center truncate text-sm font-medium">
          {t("yours")}
        </label>

        <input
          id="yours"
          type="checkbox"
          disabled={session.status === "loading"}
          checked={!!query.userIds?.includes(session.data?.user.id || 0)}
          onChange={(e) => {
            if (e.target.checked) {
              pushItemToKey("userIds", session.data?.user.id || 0);
            } else if (!e.target.checked) {
              removeItemByKeyAndValue("userIds", session.data?.user.id || 0);
            }
          }}
          className="text-primary-600 focus:ring-primary-500 border-default inline-flex h-4 w-4 place-self-center justify-self-end rounded "
        />
      </div>
      {teams &&
        teams.map((team) => (
          <div
            className="item-center focus-within:bg-subtle hover:bg-muted flex px-4 py-[6px] hover:cursor-pointer"
            key={`${team.id}`}>
            <Avatar
              imageSrc={team.logo}
              size="sm"
              alt={`${team.name} Avatar`}
              gravatarFallbackMd5="fallback"
              className="self-center"
              asChild
            />
            <label
              htmlFor={team.name}
              className="text-default ml-2 mr-auto select-none self-center truncate text-sm font-medium hover:cursor-pointer">
              {team.name}
            </label>

            <input
              id={team.name}
              name={team.name}
              type="checkbox"
              checked={query.teamIds?.includes(team.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  pushItemToKey("teamIds", team.id);
                } else if (!e.target.checked) {
                  removeItemByKeyAndValue("teamIds", team.id);
                }
              }}
              className="text-primary-600 focus:ring-primary-500 border-default inline-flex h-4 w-4 place-self-center justify-self-end rounded "
            />
          </div>
        ))}
    </AnimatedPopover>
  );
};
