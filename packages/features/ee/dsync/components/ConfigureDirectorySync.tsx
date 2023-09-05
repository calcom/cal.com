import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

import CreateDirectoryDialog from "./CreateDirectoryDialog";

const ConfigureDirectorySync = ({ teamId }: { teamId: number | null }) => {
  const { t } = useLocale();
  const [openModal, setOpenModal] = useState(false);

  return (
    <div>
      <div className="flex flex-col sm:flex-row">
        <div>
          <h2 className="font-medium">SCIM</h2>
          <p className="text-default text-sm font-normal leading-6 dark:text-gray-300">
            Configure an identity provider to get started with SCIM.
          </p>
        </div>
        <div className="flex-shrink-0 pt-3 sm:ml-auto sm:pl-3 sm:pt-0">
          <Button color="secondary" onClick={() => setOpenModal(true)}>
            Configure
          </Button>
        </div>
      </div>
      <CreateDirectoryDialog teamId={null} openModal={openModal} setOpenModal={setOpenModal} />
    </div>
  );
};

export default ConfigureDirectorySync;
