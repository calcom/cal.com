import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EventTypeDialog } from "EventTypeList/components/controls/Dialog";
import { EventTypeDropdown } from "EventTypeList/components/controls/Dropdown";
import { EventTypeTooltip } from "EventTypeList/components/controls/Tooltip";
import { EventTypeDescription } from "EventTypeList/components/event-type-description";
import { ExternalLink, LinkIcon } from "lucide-react";
import { memo, useState } from "react";

import { useOrgBranding } from "@calcom/ee/organizations/context/provider";
import { CAL_URL } from "@calcom/lib/constants";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { SchedulingType } from "@calcom/prisma/enums";
import { ArrowButton, AvatarGroup, ButtonGroup } from "@calcom/ui";

type EventTypeProps = {
  event: any;
  group: any;
  type: any;
  readOnly: boolean;
  index: number;
  firstItem: { id: string };
  lastItem: { id: string };
  moveEventType: (index: number, increment: 1 | -1) => void;
  onMutate: ({ hidden, id }: { hidden: boolean; id: string }) => void;
  onCopy: (link: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onPreview: (link: string) => void;
};

const Item = ({ type, group, readOnly }: { type: any; group: any; readOnly: boolean }) => {
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
      {readOnly && <Badge className="ml-2">Readonly</Badge>}
    </div>
  );

  return readOnly ? (
    <div className="flex-1 overflow-hidden pr-4 text-sm">
      {content()}
      <EventTypeDescription eventType={type} shortenDescription />
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
        {readOnly && <Badge className="ml-2">Readonly</Badge>}
      </div>
      <EventTypeDescription
        eventType={{ ...type, descriptionAsSafeHTML: type.safeDescription }}
        shortenDescription
      />
    </a>
  );
};

const MemoizedItem = memo(Item);

export function EventType({
  group,
  type,
  readOnly,
  index,
  firstItem,
  lastItem,
  moveEventType,
  onMutate,
  onCopy,
  onEdit,
  onDuplicate,
  onPreview,
}: EventTypeProps) {
  const isManagedEventType = type.schedulingType === SchedulingType.MANAGED;
  const embedLink = `${group.profile.slug}/${type.slug}`;
  const isChildrenManagedEventType =
    type.metadata?.managedEventConfig !== undefined && type.schedulingType !== SchedulingType.MANAGED;
  const orgBranding = useOrgBranding();
  const calLink = `${orgBranding?.fullDomain ?? CAL_URL}/${embedLink}`;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
          <MemoizedItem type={type} group={group} readOnly={readOnly} />
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
                {isManagedEventType && (
                  <>
                    {type.hidden && <Badge>Hidden</Badge>}
                    <EventTypeTooltip
                      trigger={
                        <div className="self-center rounded-md p-2">
                          <Switch
                            name="hidden"
                            checked={!type.hidden}
                            onClick={() => {
                              onMutate({ id: type.id, hidden: !type.hidden });
                            }}
                          />
                        </div>
                      }
                      content={type.hidden ? "Show on profile" : "Hide from profile"}
                    />
                  </>
                )}
                <ButtonGroup combined>
                  {!isManagedEventType && (
                    <>
                      <EventTypeTooltip
                        trigger={
                          <Button
                            data-testid="preview-link-button"
                            className="bg-secondary color-secondary"
                            onClick={() => {
                              onPreview(calLink);
                            }}>
                            <ExternalLink />
                          </Button>
                        }
                        content="Preview"
                      />
                      <EventTypeTooltip
                        trigger={
                          <Button
                            className="bg-secondary color-secondary"
                            onClick={() => {
                              onCopy(calLink);
                            }}>
                            <LinkIcon />
                          </Button>
                        }
                        content="Copy link to event"
                      />
                    </>
                  )}
                  <EventTypeDropdown
                    group={group}
                    isReadOnly={readOnly}
                    isManagedEventType={isManagedEventType}
                    isChildrenManagedEventType={isChildrenManagedEventType}
                    embedLink={embedLink}
                    id={type.id}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                  />
                </ButtonGroup>
              </div>
            </div>
          </div>
        </div>
      </div>
      <EventTypeDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete event type?"
        description="Anyone who you've shared this link with will no longer be able to book using it."
        content={
          <div className="flex items-center justify-end">
            <Button
              onClick={() => {
                setDeleteDialogOpen(false);
              }}
              variant="outline"
              className="border-none">
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Add appropriate event handler to delete given event type
              }}>
              Yes, delete
            </Button>
          </div>
        }
      />
    </li>
  );
}
