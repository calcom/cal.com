import { memo } from "react";

import { useOrgBranding } from "@calcom/ee/organizations/context/provider";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { SchedulingType } from "@calcom/prisma/enums";
import { ArrowButton, AvatarGroup } from "@calcom/ui";

const Item = ({ type, group, readOnly }: { type: any; group: any; readonly: boolean }) => {
  const content = () => (
    <div>
      <span
        className="text-default font-semibold ltr:mr-1 rtl:ml-1"
        data-testid={`event-type-title-${type.id}`}>
        {type.title}
      </span>
      {group.profile.slug ? (
        <small
          className="text-subtle hidden font-normal leading-4 sm:inline"
          data-testid={`event-type-slug-${type.id}`}>
          {`/${type.schedulingType !== SchedulingType.MANAGED ? group.profile.slug : "username"}/${
            type.slug
          }`}
        </small>
      ) : null}
      {readOnly && <>Return badge from shadcn here</>}
    </div>
  );

  return readOnly ? (
    <div className="flex-1 overflow-hidden pr-4 text-sm">
      {content()}
      {/* Return EventTypeDescription component here */}
    </div>
  ) : (
    <a href={`/event-types/${type.id}?tabName=setup`}>
      <div>
        <span
          className="text-default font-semibold ltr:mr-1 rtl:ml-1"
          data-testid={`event-type-title-${type.id}`}>
          {type.title}
        </span>
        {group.profile.slug ? (
          <small
            className="text-subtle hidden font-normal leading-4 sm:inline"
            data-testid={`event-type-slug-${type.id}`}>
            {`/${group.profile.slug}/${type.slug}`}
          </small>
        ) : null}
        {readOnly && <>Return badge from shadcn here</>}
      </div>
      {/* Return EventTypeDescription component here */}
    </a>
  );
};

const MemoizedItem = memo(Item);

export function EventType({
  event,
  type,
  index,
  firstItem,
  lastItem,
  moveEventType,
}: {
  event: any;
  type: any;
  index: number;
  firstItem: { id: string };
  lastItem: { id: string };
  moveEventType: (index: number, increment: 1 | -1) => void;
}) {
  const isManagedEventType = type.schedulingType === SchedulingType.MANAGED;
  const orgBranding = useOrgBranding();

  return (
    <li>
      <div className="hover:bg-muted flex w-full items-center justify-between">
        <div className="group flex w-full max-w-full items-center justify-between overflow-hidden px-4 py-4 sm:px-6">
          {!(firstItem && firstItem.id === type.id) && (
            <ArrowButton arrowDirection="up" onClick={() => moveEventType(index, -1)} />
          )}
          {!(lastItem && lastItem.id === type.id) && (
            <ArrowButton arrowDirection="down" onClick={() => moveEventType(index, 1)} />
          )}
          <MemoizedItem />
          <div className="mt-4 hidden sm:mt-0 sm:flex">
            <div className="flex justify-between space-x-2 rtl:space-x-reverse">
              {type.team && !isManagedEventType && (
                <AvatarGroup
                  className="relative right-3 top-1"
                  size="sm"
                  truncateAfter={4}
                  items={
                    type?.users
                      ? type.users.map((organizer: { name: string | null; username: string | null }) => ({
                          alt: organizer.name || "",
                          image: `${orgBranding?.fullDomain ?? WEBAPP_URL}/${organizer.username}/avatar.png`,
                          title: organizer.name || "",
                        }))
                      : []
                  }
                />
              )}
              {isManagedEventType && type?.children && type.children?.length > 0 && (
                <AvatarGroup
                  className="relative right-3 top-1"
                  size="sm"
                  truncateAfter={4}
                  items={type?.children
                    .flatMap((ch) => ch.users)
                    .map((user: Pick<User, "name" | "username">) => ({
                      alt: user.name || "",
                      image: `${orgBranding?.fullDomain ?? WEBAPP_URL}/${user.username}/avatar.png`,
                      title: user.name || "",
                    }))}
                />
              )}
              <div className="flex items-center justify-between space-x-2 rtl:space-x-reverse">
                {isManagedEventType && <>{type.hidden && <>Return badge here </>}</>}
              </div>
            </div>
          </div>
        </div>
        <div className="min-w-9 mx-5 flex sm:hidden" />
      </div>
    </li>
  );
}
