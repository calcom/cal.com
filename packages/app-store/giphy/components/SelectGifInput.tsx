import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";

import { SearchDialog } from "./SearchDialog";

interface ISelectGifInput {
  defaultValue?: string | null;
  onChange: (url: string) => void;
  disabled?: boolean;
}
export default function SelectGifInput(props: ISelectGifInput) {
  const { t } = useLocale();
  const [selectedGif, setSelectedGif] = useState(props.defaultValue);
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div className="flex flex-col items-start space-x-2 stack-y-2 rtl:space-x-reverse">
      {selectedGif && (
        <div className="min-h-[200px]">
          <img alt="Selected Gif Image" src={selectedGif} />
        </div>
      )}
      <div className="flex">
        {selectedGif ? (
          <Button
            color="minimal"
            type="button"
            StartIcon="pencil"
            onClick={() => setShowDialog(true)}
            disabled={props.disabled}>
            Change
          </Button>
        ) : (
          <Button
            color="minimal"
            type="button"
            StartIcon="plus"
            onClick={() => setShowDialog(true)}
            disabled={props.disabled}>
            Add from Giphy
          </Button>
        )}

        {selectedGif && (
          <Button
            color="destructive"
            type="button"
            StartIcon="x"
            onClick={() => {
              setSelectedGif("");
              props.onChange("");
            }}
            disabled={props.disabled}>
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
