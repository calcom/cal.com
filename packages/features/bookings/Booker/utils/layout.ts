import type { BookerLayouts } from "@calcom/prisma/zod-utils";
import { bookerLayoutOptions } from "@calcom/prisma/zod-utils";

export const validateLayout = (layout?: BookerLayouts | null) => {
  return bookerLayoutOptions.find((validLayout) => validLayout === layout);
};

export const userNamesInDescription = (users) => {
  const numberOfUsers = users.length;
  if (numberOfUsers === 1) {
    return `${users[0].name}`;
  } else if (numberOfUsers === 2) {
    return `${users[0].name} and ${users[1].name}`;
  } else {
    let listOfUsers = "";
    for (let i = 0; i < numberOfUsers - 1; i++) {
      listOfUsers += `${users[i].name}, `;
    }
    listOfUsers += `and ${users[numberOfUsers - 1].name}`;
    return listOfUsers;
  }
};
