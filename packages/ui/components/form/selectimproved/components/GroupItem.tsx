import React from "react";

import { Label } from "../../inputs/Label";
import Item from "./Item";
import { Option } from "./type";

interface GroupItemProps {
  item: Option & { options: Option[] }; // We know options exist here
  index: number;
  keyboardFocusIndex: number;
}

function GroupItem({ item, index: tabIndex, keyboardFocusIndex }: GroupItemProps) {
  return (
    <>
      {item.options.length > 0 && (
        <>
          <Label>{item.label}</Label>

          <div className="flex flex-col space-y-[1px]">
            {item.options.map((item, internalIndex) => {
              const hocused = internalIndex + tabIndex === keyboardFocusIndex;
              return (
                <Item key={internalIndex} item={item} index={internalIndex + tabIndex} hocused={hocused} />
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

export default GroupItem;
