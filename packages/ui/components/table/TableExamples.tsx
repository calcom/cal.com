import { Table } from "./Table";
import { TableActions } from "./TableActions";
import {
  Table as TableNew,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
  TableCaption,
} from "./TableNew";

export const TableNewExampleComponent = () => (
  <TableNew>
    <TableHeader>
      <TableRow>
        <TableHead>Header Column 1</TableHead>
        <TableHead>Header Column 2</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>Row 1, Cell 1</TableCell>
        <TableCell>Row 1, Cell 2</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Row 2, Cell 1</TableCell>
        <TableCell>Row 2, Cell 2</TableCell>
      </TableRow>
    </TableBody>
    <TableFooter>
      <TableRow>
        <TableCell>Row 3(footer), Cell 1</TableCell>
        <TableCell>Row 3(footer), Cell 2</TableCell>
      </TableRow>
    </TableFooter>
    <TableCaption>Table Caption</TableCaption>
  </TableNew>
);

export const TableExampleComponent = () => (
  <Table>
    <Table.Header>
      <Table.Row>
        <Table.ColumnTitle>Title Column 1</Table.ColumnTitle>
        <Table.ColumnTitle>Title Column 2</Table.ColumnTitle>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      <Table.Row>
        <Table.Cell>Row 1, Cell 1</Table.Cell>
        <Table.Cell>Row 1, Cell 2</Table.Cell>
      </Table.Row>
      <Table.Row>
        <Table.Cell>Row 2, Cell 1</Table.Cell>
        <Table.Cell>Row 2, Cell 2</Table.Cell>
      </Table.Row>
      <Table.Row>
        <TableActions
          actions={[
            {
              id: "action1",
              label: "Action 1",
              href: "#1",
            },
            {
              id: "action2",
              label: "Action 2",
              actions: [
                {
                  id: "action3",
                  label: "Action 3",
                  href: "#nested-action",
                },
              ],
            },
          ]}
        />
      </Table.Row>
    </Table.Body>
  </Table>
);
