import { Button } from "@calid/features/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@calid/features/ui/components/table";
import { format } from "date-fns";
import { CalendarPlus, MoreHorizontal, Share2, User } from "lucide-react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { Contact, ContactSortDirection, ContactSortKey } from "../types";
import { ContactAvatar } from "./ContactAvatar";
import { ContactsSortHeader } from "./ContactsSortHeader";

interface ContactsTableProps {
  contacts: Contact[];
  sortKey: ContactSortKey;
  sortDirection: ContactSortDirection;
  onSortChange: (key: ContactSortKey) => void;
  onRowClick: (contactId: number) => void;
  onShare: (contact: Contact) => void;
  onSchedule: (contact: Contact) => void;
}

export const ContactsTable = ({
  contacts,
  sortKey,
  sortDirection,
  onSortChange,
  onRowClick,
  onShare,
  onSchedule,
}: ContactsTableProps) => {
  const { t } = useLocale();

  return (
    <div className="border-border w-full overflow-hidden rounded-lg border">
      {/* Horizontal scroll wrapper for narrow viewports */}
      <div className="w-full overflow-x-auto">
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="">
                <ContactsSortHeader
                  label={t("name")}
                  field="name"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSortChange={onSortChange}
                />
              </TableHead>
              <TableHead>{t("phone")}</TableHead>
              <TableHead>
                <ContactsSortHeader
                  label={t("contacts_created")}
                  field="createdAt"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSortChange={onSortChange}
                />
              </TableHead>
              <TableHead>{t("contacts_last_meeting")}</TableHead>
              <TableHead className="w-12">{t("contacts_actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow
                key={contact.id}
                className="group cursor-pointer"
                onClick={() => onRowClick(contact.id)}>
                <TableCell className="min-w-0 whitespace-nowrap">
                  <div className="flex w-fit min-w-min items-start gap-3">
                    <ContactAvatar name={contact.name} avatar={contact.avatar} size="md" />

                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{contact.name}</div>

                      <div className="text-muted-foreground max-w-[160px] truncate text-xs md:max-w-[200px]">
                        {contact.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground  text-sm lg:table-cell">
                  {contact.phone || <span className="text-muted-foreground/40">—</span>}
                </TableCell>
                <TableCell className="text-muted-foreground  whitespace-nowrap text-sm ">
                  {format(contact.createdAt, "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-muted-foreground  whitespace-nowrap text-sm">
                  {contact.lastMeeting ? format(contact.lastMeeting, "MMM d, yyyy") : "—"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                      <Button variant="icon" color="minimal" size="sm" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                      <DropdownMenuItem onClick={() => onRowClick(contact.id)}>
                        <User className="mr-2 h-3.5 w-3.5" /> {t("contacts_view_profile")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onShare(contact)}>
                        <Share2 className="mr-2 h-3.5 w-3.5" /> {t("contacts_share_availability")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSchedule(contact)}>
                        <CalendarPlus className="mr-2 h-3.5 w-3.5" /> {t("contacts_schedule_meeting")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
