import type { Dispatch, SetStateAction } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, DialogContent, DialogFooter, DialogClose, Button, CheckboxField } from "@calcom/ui";

export function BulkEditDefaultModal(props: {
  open: boolean;
  setOpen: (open: boolean) => void;
  ids: number[];
  setIds: Dispatch<SetStateAction<number[]>>;
  isPending: boolean;
  data?: {
    id: number;
    title: string;
    default?: boolean;
  }[];
  title: string;
  description: string;
  handleSubmit: () => void;
}) {
  const { title, description, handleSubmit, data, ids, setIds, open } = props;
  const { t } = useLocale();
  if (!open || !data || !ids) return null;

  return (
    <Dialog name="Bulk Default Update" open={props.open} onOpenChange={props.setOpen}>
      <DialogContent type="creation" title={title} description={description} enableOverflow>
        <div className="flex flex-col space-y-2">
          {data.length > 0 && (
            <div className="flex items-center space-x-2 rounded-md px-3 pb-2.5 pt-1">
              <CheckboxField
                description={t("select_all")}
                descriptionAsLabel
                onChange={(e) => {
                  setIds(e.target.checked ? data.map((e) => e.id) : []);
                }}
                checked={ids.length === data.length}
              />
            </div>
          )}
          {data.map((item) => (
            <div key={item.id} className="bg-muted flex items-center space-x-2 rounded-md px-3 py-2.5">
              <CheckboxField
                description={item.title}
                descriptionAsLabel
                checked={ids.includes(item.id)}
                onChange={(e) => {
                  setIds(e.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id));
                }}
              />
            </div>
          ))}
        </div>
        <DialogFooter showDivider className="mt-10">
          <DialogClose />
          <Button type="submit" color="primary" loading={props.isPending} onClick={handleSubmit}>
            {t("update")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
