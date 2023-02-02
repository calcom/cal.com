import React from "react";

import { Label } from "../../inputs/Label";
import Item from "./Item";
import { Option } from "./type";

interface GroupItemProps {
  item: Option & { options: Option[] }; // We know options exist here
  index: number;
  hoveredIndex: number;
  keyboardFocusIndex: number;
}

function GroupItem({ item, index: tabIndex, hoveredIndex, keyboardFocusIndex }: GroupItemProps) {
  return (
    <>
      {item.options.length > 0 && (
        <>
          <Label>{item.label}</Label>

          {item.options.map((item, internalIndex) => {
            const hocused =
              internalIndex + tabIndex === hoveredIndex || internalIndex + tabIndex === keyboardFocusIndex;
            return (
              <Item key={internalIndex} item={item} index={internalIndex + tabIndex} hocused={hocused} />
            );
          })}
        </>
      )}
    </>
  );
}

export default GroupItem;
