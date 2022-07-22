import { useSelect } from "downshift";
import { useState } from "react";

import { classNames } from "@calcom/lib";

type IItem =
  | {
      itemType: "ListItem";
      title: string;
      description: string;
      value: string;
    }
  | {
      itemType: "Title";
      title: string;
      value: string;
    }
  | {
      itemType: "NameCard";
      img: string;
      value: string;
      name: string;
    }
  | {
      itemType: "Spacer";
    };
interface SelectProps {
  items: IItem[];
}

function itemToString(item: IItem | null) {
  return item && item.itemType !== "Spacer" && item?.value ? item.value : "";
}

function Select({ items }: SelectProps) {
  const [selectedItems, setSelectedItems] = useState<IItem[]>([]);
  const {
    isOpen,
    selectedItem,
    getToggleButtonProps,
    getLabelProps,
    getMenuProps,
    highlightedIndex,
    getItemProps,
  } = useSelect<IItem>({
    items,
    itemToString,
    selectedItem: null,
    onSelectedItemChange: ({ selectedItem }) => {
      if (!selectedItem) {
        return;
      }

      const index = selectedItems.indexOf(selectedItem);

      if (index > 0) {
        setSelectedItems([...selectedItems.slice(0, index), ...selectedItems.slice(index + 1)]);
      } else if (index === 0) {
        setSelectedItems([...selectedItems.slice(1)]);
      } else {
        setSelectedItems([...selectedItems, selectedItem]);
      }
    },
  });
  const buttonText = selectedItems.length ? `${selectedItems.length} elements selected` : "Elements";

  return (
    <div>
      <div className="flex w-72 flex-col gap-1">
        <label {...getLabelProps()}>Choose your favorite book:</label>
        <button
          aria-label="toggle menu"
          className="flex justify-between bg-white p-2"
          type="button"
          {...getToggleButtonProps()}>
          <span>{buttonText}</span>
          <span className="px-2">{isOpen ? <>&#8593;</> : <>&#8595;</>}</span>
        </button>
      </div>
      <ul {...getMenuProps()} className="absolute max-h-80 w-72 overflow-scroll bg-white shadow-md">
        {isOpen &&
          items.map((item, index) => {
            if (item.itemType === "Spacer") return; // Return a spacer that isnt selectable
            return (
              <li
                className={classNames(
                  // highlightedIndex == index && 'bg-blue-300',
                  // selectedItem === item && 'font-bold',
                  "flex items-center gap-3 py-2 px-3 shadow-sm"
                )}
                key={`${item.value}${index}`}
                {...getItemProps({ item, index })}>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={selectedItems.includes(item)}
                  value={item.value}
                  onChange={() => null}
                />
                <div className="flex flex-col">
                  <span>{item.value}</span>
                  {/* {<span className="text-sm text-gray-700">{item.description}</span>} */}
                </div>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

export default Select;
