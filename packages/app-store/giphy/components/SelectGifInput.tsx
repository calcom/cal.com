import { PencilAltIcon, PlusIcon, XIcon } from "@heroicons/react/solid";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

import { SearchDialog } from "./SearchDialog";

interface ISelectGifInput {
  defaultValue?: string | null;
  onChange: (url: string) => void;
}
export default function SelectGifInput(props: ISelectGifInput) {
  const { t } = useLocale();
  const [selectedGif, setSelectedGif] = useState(props.defaultValue);
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div className="flex flex-col items-start space-x-2 space-y-2 rtl:space-x-reverse">
      {selectedGif && (
        <div className="min-h-[200px]">
          <img alt="Selected Gif Image" src={selectedGif} />
        </div>
      )}
      <div className="flex">
        {selectedGif ? (
          <Button color="minimal" type="button" StartIcon={PencilAltIcon} onClick={() => setShowDialog(true)}>
            Change
          </Button>
        ) : (
          <Button color="minimal" type="button" StartIcon={PlusIcon} onClick={() => setShowDialog(true)}>
            Add from Giphy
          </Button>
        )}

        {selectedGif && (
          <Button
            color="destructive"
            type="button"
            StartIcon={XIcon}
            onClick={() => {
              setSelectedGif("");
              props.onChange("");
            }}>
            {t("remove")}
          </Button>
        )}
      </div>
      <SearchDialog
        isOpenDialog={showDialog}
        setIsOpenDialog={setShowDialog}
        onSave={(url) => {
          setSelectedGif(url);
          props.onChange(url);
        }}
      />
    </div>
  );
}
