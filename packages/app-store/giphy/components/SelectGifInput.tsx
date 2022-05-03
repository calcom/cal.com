import { SearchIcon, TrashIcon } from "@heroicons/react/solid";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";

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
    <div className="flex flex-col items-start space-x-2 space-y-2">
      {selectedGif && (
        <div>
          <img alt={"Selected Gif Image"} src={selectedGif} />
        </div>
      )}
      <div className="flex">
        <Button color="secondary" type="button" StartIcon={SearchIcon} onClick={() => setShowDialog(true)}>
          Search on Giphy
        </Button>
        {selectedGif && (
          <Button
            color="warn"
            type="button"
            StartIcon={TrashIcon}
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
