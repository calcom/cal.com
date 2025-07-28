"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/server";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

export type ListAgents = RouterOutputs["viewer"]["ai"]["list"]["filtered"][0];

interface Props {
  agents: ListAgents[];
}

export default function AgentsListPage({ agents }: Props) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDeleteId, setAgentToDeleteId] = useState("");
  const [parent] = useAutoAnimate<HTMLUListElement>();
  const router = useRouter();

  const deleteMutation = trpc.viewer.ai.delete.useMutation({
    onError: async (err) => {
      console.error(err.message);
      await utils.viewer.ai.list.cancel();
      await utils.viewer.ai.list.invalidate();
    },
    onSettled: () => {
      utils.viewer.ai.list.invalidate();
    },
  });

  const handleDelete = async (agentId: string) => {
    deleteMutation.mutate({ id: agentId });
    setDeleteDialogOpen(false);
  };

  console.log("agents", agents);

  if (!agents || agents.length === 0) {
    return <div>No agents found</div>;
  }

  return (
    <>
      <div className="bg-default border-subtle overflow-hidden rounded-md border sm:mx-0">
        <ul className="divide-subtle !static w-full divide-y" data-testid="agents-list" ref={parent}>
          {agents.map((agent) => {
            const dataTestId = `agent-${agent.name.toLowerCase().replaceAll(" ", "-")}`;
            return (
              <li
                key={agent.id}
                data-testid={dataTestId}
                className="group flex w-full max-w-full items-center justify-between overflow-hidden">
                <div className="first-line:group hover:bg-muted flex w-full items-center justify-between p-4 transition sm:px-6">
                  <Link href={`/agents/${agent.id}`} className="flex-grow cursor-pointer">
                    <div className="rtl:space-x-reverse">
                      <div className="flex">
                        <div
                          className={classNames(
                            "max-w-56 text-emphasis truncate text-sm font-medium leading-6 md:max-w-max",
                            agent.name ? "text-emphasis" : "text-subtle"
                          )}>
                          {agent.name || "Untitled Agent"}
                        </div>
                        <div>
                          {!agent.enabled && (
                            <Badge variant="gray" className="ml-2">
                              {t("disabled")}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <ul className="mt-1 flex flex-wrap space-x-2 sm:flex-nowrap">
                        {agent.outboundPhoneNumbers && agent.outboundPhoneNumbers.length > 0 ? (
                          agent.outboundPhoneNumbers.map((outboundPhoneNumber) => (
                            <li key={outboundPhoneNumber.phoneNumber}>
                              <Badge variant="gray">
                                <div>
                                  <Icon name="phone" className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
                                  <span>{outboundPhoneNumber.phoneNumber}</span>
                                </div>
                              </Badge>
                            </li>
                          ))
                        ) : (
                          <li>
                            <Badge variant="gray">
                              <div>
                                <Icon name="phone" className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
                                <span>{t("none")}</span>
                              </div>
                            </Badge>
                          </li>
                        )}
                        <div className="block md:hidden">
                          {agent.team?.name && (
                            <li>
                              <Badge variant="gray">
                                <>{agent.team.name}</>
                              </Badge>
                            </li>
                          )}
                        </div>
                      </ul>
                    </div>
                  </Link>
                  <div>
                    <div className="hidden md:block">
                      {agent.team?.name && (
                        <Badge className="mr-4 mt-1 p-[1px] px-2" variant="gray">
                          <Avatar
                            alt={agent.team?.name || ""}
                            href={
                              agent.team?.id
                                ? `/settings/teams/${agent.team?.id}/profile`
                                : "/settings/my-account/profile"
                            }
                            imageSrc={getPlaceholderAvatar(agent?.team?.logoUrl, agent.team?.name as string)}
                            size="xs"
                            className="mt-[3px] inline-flex justify-center"
                          />
                          <div>{agent.team.name}</div>
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-shrink-0">
                    <div className="hidden sm:block">
                      <ButtonGroup combined>
                        <Tooltip content={t("edit") as string}>
                          <Button
                            type="button"
                            color="secondary"
                            variant="icon"
                            StartIcon="pencil"
                            onClick={async () => await router.replace(`/agents/${agent.id}`)}
                            data-testid="edit-button"
                          />
                        </Tooltip>
                        <Tooltip content={t("delete") as string}>
                          <Button
                            onClick={() => {
                              setDeleteDialogOpen(true);
                              setAgentToDeleteId(agent.id);
                            }}
                            color="secondary"
                            variant="icon"
                            StartIcon="trash-2"
                            data-testid="delete-button"
                          />
                        </Tooltip>
                      </ButtonGroup>
                    </div>
                    <div className="block sm:hidden">
                      <Dropdown>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" color="minimal" variant="icon" StartIcon="ellipsis" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <DropdownItem
                              type="button"
                              StartIcon="pencil"
                              onClick={async () => await router.replace(`/agents/${agent.id}`)}>
                              {t("edit")}
                            </DropdownItem>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <DropdownItem
                              type="button"
                              color="destructive"
                              StartIcon="trash-2"
                              onClick={() => {
                                setDeleteDialogOpen(true);
                                setAgentToDeleteId(agent.id);
                              }}>
                              {t("delete")}
                            </DropdownItem>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </Dropdown>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-default border-subtle rounded-lg border p-6 shadow-lg">
            <h3 className="text-lg font-medium">{t("delete_agent")}</h3>
            <p className="mt-2 text-sm text-gray-500">{t("delete_agent_confirmation")}</p>
            <div className="mt-4 flex justify-end space-x-2">
              <Button color="secondary" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button color="destructive" onClick={() => handleDelete(agentToDeleteId)}>
                {t("delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
