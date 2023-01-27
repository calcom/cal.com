import { useCombobox, useMultipleSelection } from "downshift";
import React from "react";

import { classNames } from "@calcom/lib";

import { Input } from "../inputs/Input";
import { Label } from "../inputs/Label";

export function MultipleComboBoxExample() {
  const books = [
    { author: "Harper Lee", title: "To Kill a Mockingbird" },
    { author: "Lev Tolstoy", title: "War and Peace" },
    { author: "Fyodor Dostoyevsy", title: "The Idiot" },
    { author: "Oscar Wilde", title: "A Picture of Dorian Gray" },
    { author: "George Orwell", title: "1984" },
    { author: "Jane Austen", title: "Pride and Prejudice" },
    { author: "Marcus Aurelius", title: "Meditations" },
    { author: "Fyodor Dostoevsky", title: "The Brothers Karamazov" },
    { author: "Lev Tolstoy", title: "Anna Karenina" },
    { author: "Fyodor Dostoevsky", title: "Crime and Punishment" },
  ];
  const initialSelectedItems = [books[0], books[1]];

  function getFilteredBooks(selectedItems: typeof books, inputValue: string) {
    const lowerCasedInputValue = inputValue.toLowerCase();

    return books.filter(function filterBook(book) {
      return (
        !selectedItems.includes(book) &&
        (book.title.toLowerCase().includes(lowerCasedInputValue) ||
          book.author.toLowerCase().includes(lowerCasedInputValue))
      );
    });
  }

  function MultipleComboBox() {
    const [inputValue, setInputValue] = React.useState("");
    const [selectedItems, setSelectedItems] = React.useState(initialSelectedItems);
    const items = React.useMemo(
      () => getFilteredBooks(selectedItems, inputValue),
      [selectedItems, inputValue]
    );
    const { getSelectedItemProps, getDropdownProps, addSelectedItem, removeSelectedItem } =
      useMultipleSelection({
        selectedItems,
        onStateChange({ selectedItems: newSelectedItems, type }) {
          switch (type) {
            case useMultipleSelection.stateChangeTypes.SelectedItemKeyDownBackspace:
            case useMultipleSelection.stateChangeTypes.SelectedItemKeyDownDelete:
            case useMultipleSelection.stateChangeTypes.DropdownKeyDownBackspace:
            case useMultipleSelection.stateChangeTypes.FunctionRemoveSelectedItem:
              if (newSelectedItems) {
                setSelectedItems(newSelectedItems);
              }
              break;
            default:
              break;
          }
        },
      });
    const {
      isOpen,
      getToggleButtonProps,
      getLabelProps,
      getMenuProps,
      getInputProps,
      highlightedIndex,
      getItemProps,
      selectedItem,
    } = useCombobox({
      items,
      itemToString(item) {
        return item ? item.title : "";
      },
      defaultHighlightedIndex: 0, // after selection, highlight the first item.
      selectedItem: null,
      stateReducer(state, actionAndChanges) {
        const { changes, type } = actionAndChanges;

        switch (type) {
          case useCombobox.stateChangeTypes.InputKeyDownEnter:
          case useCombobox.stateChangeTypes.ItemClick:
          case useCombobox.stateChangeTypes.InputBlur:
            return {
              ...changes,
              ...(changes.selectedItem && { isOpen: true, highlightedIndex: 0 }),
            };
          default:
            return changes;
        }
      },
      onStateChange({ inputValue: newInputValue, type, selectedItem: newSelectedItem }) {
        switch (type) {
          case useCombobox.stateChangeTypes.InputKeyDownEnter:
          case useCombobox.stateChangeTypes.ItemClick:
            if (newSelectedItem) {
              setSelectedItems([...selectedItems, newSelectedItem]);
            }

            break;

          case useCombobox.stateChangeTypes.InputChange:
            if (newInputValue) {
              setInputValue(newInputValue);
            }
            break;
          default:
            break;
        }
      },
    });

    return (
      <div>
        <div className="flex flex-col">
          <Label {...getLabelProps()}>Pick some books:</Label>
          <div
            aria-label="menu-toggle"
            {...getToggleButtonProps(getDropdownProps({ preventKeyAction: isOpen }))}
            className="flex h-9 space-x-1 rounded-md border border-gray-300 p-1 focus-within:border-gray-900 hover:cursor-pointer hover:border-gray-400 focus-visible:border-gray-900">
            {selectedItems.map(function renderSelectedItem(selectedItemForRender, index) {
              return (
                <span
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
                </span>
              );
            })}
          </div>
        </div>
        <ul
          {...getMenuProps()}
          className="absolute mt-2 max-h-80 max-w-[256px] overflow-scroll rounded-md border-gray-300 bg-white p-0 focus-visible:border-gray-900">
          {isOpen && (
            <>
              <div className="flex grow gap-0.5">
                <Input
                  placeholder="Best book ever"
                  className="w-full"
                  {...getInputProps(getDropdownProps({ preventKeyAction: isOpen }))}
                />
              </div>
              {items.map((item, index) => (
                <li
                  className={classNames(
                    "space-between flex cursor-pointer items-center space-x-2 px-3 py-[10px] text-sm hover:bg-gray-200"
                  )}
                  key={`${item.title}${index}`}
                  {...getItemProps({ item, index })}>
                  <span>{item.title}</span>
                </li>
              ))}
            </>
          )}
        </ul>
      </div>
    );
  }
  return <MultipleComboBox />;
}
