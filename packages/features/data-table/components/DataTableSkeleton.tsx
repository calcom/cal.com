import { TableNew, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@calcom/ui";

interface DataTableSkeletonProps {
  columns: number;
  rows?: number;
  columnWidths?: number[];
}

export function DataTableSkeleton({ columns, rows = 10, columnWidths = [] }: DataTableSkeletonProps) {
  return (
    <div
      className="grid h-[75dvh]"
      style={{ gridTemplateRows: "auto 1fr auto", gridTemplateAreas: "'header' 'body' 'footer'" }}>
      <div
        className="scrollbar-thin border-subtle relative h-full overflow-auto rounded-md border"
        style={{ gridArea: "body" }}>
        <TableNew>
          <TableHeader className="bg-subtle sticky top-0 z-10">
            <TableRow>
              {[...Array(columns)].map((_, index) => (
                <TableHead key={`skeleton-header-${index}`}>
                  <div
                    className="bg-subtle h-4 animate-pulse rounded-md"
                    style={{ width: columnWidths[index] ? `${columnWidths[index]}px` : "200px" }}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(rows)].map((_, rowIndex) => (
              <TableRow key={`skeleton-row-${rowIndex}`}>
                {[...Array(columns)].map((_, colIndex) => (
                  <TableCell key={`skeleton-cell-${rowIndex}-${colIndex}`}>
                    <div
                      className="bg-subtle h-6 animate-pulse rounded-md"
                      style={{ width: columnWidths[colIndex] ? `${columnWidths[colIndex]}px` : "200px" }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </TableNew>
      </div>
    </div>
  );
}
