import { useMultipleSelection, useSelect } from "downshift";

import { classNames } from "@calcom/lib";

import { Label } from "../inputs/Label";

export function SelectDownshift() {
  const books = [
    { author: "Harper Lee", title: "To Kill a Mockingbird" },
    { author: "Lev Tolstoy", title: "War and Peace" },
    { author: "Fyodor Dostoyevsy", title: "The Idiot" },
    { author: "Oscar Wilde", title: "A Picture of Dorian Gray" },
    { author: "George Orwell", title: "1984" },
    { type: "divider" },
    { author: "Jane Austen", title: "Pride and Prejudice" },
    { author: "Marcus Aurelius", title: "Meditations" },
    { author: "Fyodor Dostoevsky", title: "The Brothers Karamazov" },
    { author: "Lev Tolstoy", title: "Anna Karenina" },
    { author: "Fyodor Dostoevsky", title: "Crime and Punishment" },
  ];

  function MultipleSelect() {
    const { getSelectedItemProps, getDropdownProps, addSelectedItem, removeSelectedItem, selectedItems } =
      useMultipleSelection<typeof books[number]>({ initialSelectedItems: [books[0]] });
    const items = books;
    const { isOpen, getToggleButtonProps, getLabelProps, getMenuProps, getItemProps } = useSelect({
      items,
      stateReducer: (state, actionAndChanges) => {
        const { changes, type } = actionAndChanges;
        console.log({ changes, type });
        switch (type) {
          case useSelect.stateChangeTypes.ItemClick:
            return {
              ...changes,
              isOpen: true, // keep the menu open after selection.
            };
        }
        return changes;
      },
    });

    return (
      <div>
        <div className="flex flex-col">
          <Label {...getLabelProps()}>Pick some books:</Label>
          <div
            className="flex h-9 space-x-1 rounded-md border border-gray-300 p-1 focus-within:border-gray-900 hover:cursor-pointer hover:border-gray-400 focus-visible:border-gray-900"
            {...getToggleButtonProps(getDropdownProps({ preventKeyAction: isOpen }))}>
            {selectedItems.map(function renderSelectedItem(selectedItemForRender, index) {
              return (
                <div
                  className="hocus:text-gray-900 hocus:bg-gray-300 focus:border-1 flex items-center rounded-md border-transparent bg-gray-200 px-2 py-[6px] text-sm text-gray-700"
                  key={`selected-item-${index}`}
                  {...getSelectedItemProps({
                    selectedItem: selectedItemForRender,
                    index,
                  })}>
                  <span> {selectedItemForRender.title}</span>
                  <span
                    className="ml-2 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSelectedItem(selectedItemForRender);
                    }}>
                    &#10005;
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <ul
          {...getMenuProps()}
          className="absolute max-h-80 max-w-[256px] overflow-scroll rounded-md border-gray-300 bg-white p-0 focus-visible:border-gray-900">
          {isOpen &&
            items.map((item, index) => {
              const isSelected =
                selectedItems.filter((selectedItem) => selectedItem.title === item.title).length > 0;
              if (item.type === "divider") {
                return <div key={`${index}-divider`} className="h-[1px] w-full bg-gray-300" />;
              }
              return (
                <li
                  className={classNames(
                    "space-between flex cursor-pointer items-center space-x-2 px-3 py-[10px] text-sm hover:bg-gray-200"
                  )}
                  key={`${item.title}${index}`}
                  {...getItemProps({ item, index })}
                  onClick={() => {
                    isSelected ? removeSelectedItem(item) : addSelectedItem(item);
                  }}>
                  <span className="no-highlight">{item.title}</span>
                  {isSelected && <span className="text-xs text-gray-400">✓</span>}
                </li>
              );
            })}
        </ul>
      </div>
    );
  }
  return <MultipleSelect />;
}
