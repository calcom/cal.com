import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/solid";
import { useState } from "react";
import { Dispatch, SetStateAction } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/Dialog";
import { TextField } from "@calcom/ui/form/fields";
import Loader from "@calcom/web/components/Loader";

interface ISearchDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  onSave: (url: string) => void;
}

export const SearchDialog = (props: ISearchDialog) => {
  const { t } = useLocale();
  const [gifImage, setGifImage] = useState<string>("");
  const [offset, setOffset] = useState<number>(0);
  const [keyword, setKeyword] = useState<string>("");
  const { isOpenDialog, setIsOpenDialog } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const searchGiphy = async (keyword: string, offset: number) => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    const res = await fetch("/api/integrations/giphyother/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keyword,
        offset,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErrorMessage(json?.message || "Something went wrong");
    } else {
      setGifImage(json.image || "");
      setOffset(offset);
      if (!json.image) {
        setErrorMessage("No Result found");
      }
    }
    setIsLoading(false);
    return null;
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent>
        <DialogHeader title="Search a gif" />

        <div className="flex justify-center space-x-2 space-y-2">
          <TextField
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
            }}
            name="search"
            type="text"
            className="mt-2"
            labelProps={{ style: { display: "none" } }}
            placeholder="Search Giphy"
          />
          <Button
            type="button"
            tabIndex={-1}
            onClick={(event) => {
              searchGiphy(keyword, 0);
              return false;
            }}
            loading={isLoading}>
            {t("search")}
          </Button>
        </div>
        {gifImage && (
          <div className="flex flex-col items-center space-x-2 space-y-2 pt-3">
            {isLoading ? (
              <Loader />
            ) : (
              <>
                <div>
                  <img src={gifImage} alt={`Gif from Giphy for ${keyword}`} />
                </div>
                <div>
                  <nav>
                    <ul className="inline-flex space-x-2">
                      <li style={{ visibility: offset <= 0 ? "hidden" : "visible" }}>
                        <button
                          onClick={() => {
                            searchGiphy(keyword, offset - 1);
                          }}
                          className="focus:shadow-outline flex h-10 w-10 items-center justify-center rounded-full text-indigo-600 transition-colors duration-150 hover:bg-indigo-100">
                          <ChevronLeftIcon />
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            searchGiphy(keyword, offset + 1);
                          }}
                          className="focus:shadow-outline flex h-10 w-10 items-center justify-center rounded-full bg-white text-indigo-600 transition-colors duration-150 hover:bg-indigo-100">
                          <ChevronRightIcon />
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </>
            )}
          </div>
        )}
        {errorMessage && <Alert severity="error" title={errorMessage} className="my-4" />}
        <DialogFooter>
          <DialogClose
            onClick={() => {
              props.setIsOpenDialog(false);
            }}
            asChild>
            <Button type="button" color="minimal" tabIndex={-1}>
              {t("cancel")}
            </Button>
          </DialogClose>

          <Button
            type="button"
            loading={isLoading}
            onClick={() => {
              props.setIsOpenDialog(false);
              props.onSave(gifImage);
              setOffset(0);
              setGifImage("");
              setKeyword("");
              return false;
            }}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
