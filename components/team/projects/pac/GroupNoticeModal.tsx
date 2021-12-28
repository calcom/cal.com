import { DialogClose, DialogTrigger } from "@radix-ui/react-dialog";
import React from "react";

import { Dialog, DialogContent } from "@components/Dialog";
import GroupNoticeImage from "@components/team/projects/pac/GroupNoticeImage";
import Button from "@components/ui/Button";

interface IGroupNoticeModalProps {
  /**
   * The groups to be shown on the model.
   * Expected format: ["1", "5"]
   */
  groups: Array<string>;
}

export default function GroupNoticeModal(props: IGroupNoticeModalProps) {
  const { groups } = props;

  return (
    <Dialog defaultOpen>
      <DialogTrigger asChild>a</DialogTrigger>
      <DialogContent>
        <div className="flex flex-col justify-center items-center text-center">
          <GroupNoticeImage />
          <h2 className="font-bold text-lg">Estamos atendendo aos grupos:</h2>
          <h2 className="font-bold text-lg leading-3 mb-2">{`${groups[0]} a ${groups[1]}`}</h2>
          <p className="font-medium text-sm text-gray-500 max-w-[266px]">{`Para mais informações sobre o andamento de atendimento por grupos, consulte em <Nome da Tela>.`}</p>
          <DialogClose asChild className="flex flex-row w-full mt-4">
            <Button className="w-full justify-center">Fechar</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
