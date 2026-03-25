import { Button } from "@calid/features/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { CalendarPlus, Mail, MoreHorizontal, Phone, Share2 } from "lucide-react";

import type { Contact } from "../types";
import { ContactAvatar } from "./ContactAvatar";

interface ContactsMobileListProps {
  contacts: Contact[];
  onRowClick: (contactId: number) => void;
  onShare: (contact: Contact) => void;
  onSchedule: (contact: Contact) => void;
}

export const ContactsMobileList = ({
  contacts,
  onRowClick,
  onShare,
  onSchedule,
}: ContactsMobileListProps) => {
  return (
    <div className="space-y-2">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          onClick={() => onRowClick(contact.id)}
          className="border-border bg-card hover:bg-muted/30 cursor-pointer rounded-lg border p-4 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <ContactAvatar name={contact.name} avatar={contact.avatar} size="mdLg" className="shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{contact.name}</div>
                <div className="text-muted-foreground truncate text-xs">{contact.email}</div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                <Button variant="icon" color="minimal" size="sm" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                <DropdownMenuItem onClick={() => onShare(contact)}>
                  <Share2 className="mr-2 h-3.5 w-3.5" /> Share Availability
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSchedule(contact)}>
                  <CalendarPlus className="mr-2 h-3.5 w-3.5" /> Schedule Meeting
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="text-muted-foreground mt-3 flex items-center gap-4 text-xs">
            {/* <span className="flex items-center gap-1 truncate">
              <Mail className="h-3 w-3" /> {contact.email}
            </span> */}
            {contact.phone ? (
              <span className="flex shrink-0 items-center gap-1">
                <Phone className="h-3 w-3" /> {contact.phone.slice(0, 15)}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};
