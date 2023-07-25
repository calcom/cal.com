import { Copy } from "lucide-react";
import type { Dispatch } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetClose,
  Button,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Badge,
  type BadgeProps,
} from "@calcom/ui";

import type { State, Action } from "./UserListTable";

type DisplayInfoType<T extends boolean> = {
  label: string;
  value: T extends true ? string[] : string;
  asBadge?: boolean;
  isArray?: true;
  displayCopy?: boolean;
  badgeColor?: BadgeProps["variant"];
} & (T extends false ? { displayCopy?: boolean } : { displayCopy?: never }); // Only show displayCopy if its not an array is false

function DisplayInfo<T extends boolean>({
  label,
  value,
  asBadge,
  isArray,
  displayCopy,
  badgeColor,
}: DisplayInfoType<T>) {
  const values = (isArray ? value : [value]) as string[];

  return (
    <div className="flex flex-col space-y-0.5">
      <p className="text-subtle text-xs font-semibold uppercase leading-none">{label}</p>
      <div className={classNames(asBadge ? "mt-0.5 flex space-x-2" : "flex flex-col")}>
        <>
          {values.map((v) => {
            const content = (
              <span
                className={classNames(
                  "text-emphasis inline-flex items-center gap-2 font-medium leading-5",
                  asBadge ? "text-xs" : "text-sm"
                )}>
                {v}
                {displayCopy && <Button size="sm" variant="icon" color="minimal" StartIcon={Copy} />}
              </span>
            );

            return asBadge ? (
              <Badge variant={badgeColor} size="sm">
                {content}
              </Badge>
            ) : (
              content
            );
          })}
        </>
      </div>
    </div>
  );
}

export function EditUserSheet({ state, dispatch }: { state: State; dispatch: Dispatch<Action> }) {
  const { t } = useLocale();
  const { user: selectedUser } = state.editSheet;
  const { data: loadedUser, isLoading } = trpc.viewer.organizations.getUser.useQuery(
    { userId: selectedUser?.id },
    {
      enabled: !!selectedUser,
      initialData: {
        // We can alreaedy use the selected user as initial data -> this will be overwritten by the query result (but should be the same)
        id: selectedUser?.id,
        role: selectedUser?.role,
        email: selectedUser?.email,
        username: selectedUser?.username,
        timeZone: selectedUser?.timeZone,
      },
    }
  );

  return (
    <Sheet
      open={true}
      onOpenChange={() => {
        dispatch({ type: "CLOSE_MODAL" });
      }}>
      <SheetContent position="right" size="default">
        <SheetHeader>
          <SheetTitle>{t("edit_user")}</SheetTitle>
          <SheetDescription>{t("edit_user_description")}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col space-y-5">
          <DisplayInfo label={t("email")} value={loadedUser?.email ?? ""} displayCopy />
          <DisplayInfo label={t("bio")} value={loadedUser?.bio ?? ""} />
          <DisplayInfo label={t("role")} value={loadedUser?.role ?? ""} asBadge badgeColor="blue" />
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button type="submit">Save changes</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
