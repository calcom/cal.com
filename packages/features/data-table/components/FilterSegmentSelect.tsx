import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Form,
  Input,
  Label,
  showToast,
} from "@calcom/ui";
import { MoreHorizontal, Check } from "@calcom/ui/components/icon";

interface FilterSegmentSelectProps {
  tableIdentifier: string;
  selectedSegmentId?: number;
  onSelect: (segmentId: number | undefined) => void;
}

export function FilterSegmentSelect({
  tableIdentifier,
  selectedSegmentId,
  onSelect,
}: FilterSegmentSelectProps) {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const { data: segments } = trpc.viewer.filterSegments.list.useQuery({
    tableIdentifier,
  });

  const { mutate: updateSegment } = trpc.viewer.filterSegments.update.useMutation({
    onSuccess: () => {
      utils.viewer.filterSegments.list.invalidate();
      showToast(t("filter_segment_updated"), "success");
    },
    onError: () => {
      showToast(t("error_updating_filter_segment"), "error");
    },
  });

  const { mutate: duplicateSegment } = trpc.viewer.filterSegments.create.useMutation({
    onSuccess: () => {
      utils.viewer.filterSegments.list.invalidate();
      showToast(t("filter_segment_duplicated"), "success");
    },
    onError: () => {
      showToast(t("error_duplicating_filter_segment"), "error");
    },
  });

  const { mutate: deleteSegment } = trpc.viewer.filterSegments.delete.useMutation({
    onSuccess: () => {
      utils.viewer.filterSegments.list.invalidate();
      showToast(t("filter_segment_deleted"), "success");
    },
    onError: () => {
      showToast(t("error_deleting_filter_segment"), "error");
    },
  });

  const selectedSegment = segments?.find((segment) => segment.id === selectedSegmentId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">{selectedSegment?.name || t("select_segment")}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {segments?.map((segment) => (
          <div key={segment.id} className="flex items-center justify-between">
            <DropdownMenuItem onSelect={() => onSelect(segment.id)}>
              <div className="flex items-center">
                {segment.id === selectedSegmentId && <Check className="mr-2 h-4 w-4" />}
                {segment.name}
              </div>
            </DropdownMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <Dialog>
                  <DialogTrigger asChild>
                    <DropdownMenuItem>{t("rename")}</DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader title={t("rename_segment")} />
                    <Form
                      onSubmit={({ name }) => {
                        updateSegment({
                          id: segment.id,
                          scope: segment.scope,
                          teamId: segment.teamId,
                          name,
                        });
                      }}>
                      <div className="space-y-4">
                        <div>
                          <Label>{t("name")}</Label>
                          <Input name="name" defaultValue={segment.name} />
                        </div>
                        <DialogFooter>
                          <Button type="submit">{t("save")}</Button>
                        </DialogFooter>
                      </div>
                    </Form>
                  </DialogContent>
                </Dialog>
                <DropdownMenuItem
                  onSelect={() => {
                    duplicateSegment({
                      ...segment,
                      name: `${segment.name} (${t("copy")})`,
                    });
                  }}>
                  {t("duplicate")}
                </DropdownMenuItem>
                <Dialog>
                  <DialogTrigger asChild>
                    <DropdownMenuItem className="text-error">{t("delete")}</DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader title={t("delete_segment")} />
                    <p>{t("delete_segment_confirmation")}</p>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          deleteSegment({
                            id: segment.id,
                            scope: segment.scope,
                            teamId: segment.teamId,
                          });
                          if (segment.id === selectedSegmentId) {
                            onSelect(undefined);
                          }
                        }}>
                        {t("delete")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
