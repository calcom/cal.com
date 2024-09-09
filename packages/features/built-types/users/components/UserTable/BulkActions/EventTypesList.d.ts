/// <reference types="react" />
import type { Table } from "@tanstack/react-table";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { User } from "../UserListTable";
interface Props {
    table: Table<User>;
    orgTeams: RouterOutputs["viewer"]["organizations"]["getTeams"] | undefined;
}
export declare function EventTypesList({ table, orgTeams }: Props): JSX.Element;
export {};
//# sourceMappingURL=EventTypesList.d.ts.map