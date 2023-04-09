import type { ReactElement, ReactNode } from "react";
import React from "react";

import { classNames } from "@calcom/lib";

export function VariantsTable({
  children,
  titles,
  isDark,
  columnMinWidth = 150,
}: {
  children: ReactElement<RowProps> | ReactElement<RowProps>[];
  titles: string[];
  isDark?: boolean;
  // Mainly useful on mobile, so components don't get squeesed
  columnMinWidth?: number;
}) {
  const columns = React.Children.toArray(children) as ReactElement<RowProps>[];
  return (
    <div
      className={classNames(
        isDark &&
          "relative py-8 before:absolute before:left-0 before:top-0 before:block before:h-full before:w-screen before:bg-[#1C1C1C]"
      )}>
      <div className="z-1 relative mx-auto w-full max-w-[1200px] overflow-auto pr-8 pt-6">
        <table>
          <RowTitles titles={titles} />
          {columns.map((column) => (
            <tr className="p-2 pr-6 pb-6" key={column.props.variant}>
              <th
                className="p-2 pr-6 pb-6 text-left text-sm font-normal text-[#8F8F8F]"
                key={column.props.variant}>
                {column.props.variant}
              </th>
              {React.Children.count(column.props.children) &&
                React.Children.map(column.props.children, (cell) => (
                  <td className="p-2 pr-6 pb-6" style={{ minWidth: `${columnMinWidth}px` }}>
                    {cell}
                  </td>
                ))}
            </tr>
          ))}
        </table>
      </div>
      {!isDark && (
        <div data-mode="dark" className="dark">
          <VariantsTable titles={titles} isDark columnMinWidth={columnMinWidth}>
            {children}
          </VariantsTable>
        </div>
      )}
    </div>
  );
}

interface RowProps {
  variant: string;
  children: ReactNode;
}

/**
 * There are two reasons we have this "empty" wrapper component:
 * 1. In order to have an isolate group per variant, which we iterate through in the table component.
 * 2. To have a way to pass the variant.
 */
export function VariantRow({ children }: RowProps) {
  return <>{children}</>;
}

export function RowTitles({ titles }: { titles: string[] }) {
  return (
    <tr>
      <th className="p-2 pr-6 pb-6 text-left text-sm font-normal text-[#8F8F8F]" />
      {titles.map((title) => (
        <th className="p-2 pr-6 pb-6 text-left text-sm font-normal text-[#8F8F8F]" key={title}>
          {title}
        </th>
      ))}
    </tr>
  );
}
