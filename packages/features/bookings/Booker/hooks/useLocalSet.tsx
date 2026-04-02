import { localStorage } from "@calcom/lib/webstorage";
import { useEffect, useState } from "react";

export interface HasExternalId {
  externalId: string;
}

export function useLocalSet<T extends HasExternalId>(key: string, initialValue: T[]) {
  const [set, setSet] = useState<Set<T>>(() => {
    const storedValue = localStorage.getItem(key);
    return storedValue ? new Set(JSON.parse(storedValue)) : new Set(initialValue);
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  }, [key, set]);

  const addValue = (value: T) => {
    setSet((prevSet) => new Set(prevSet).add(value));
  };

  const removeById = (id: string) => {
    setSet((prevSet) => {
      const updatedSet = new Set(prevSet);
      updatedSet.forEach((item) => {
        if (item.externalId === id) {
          updatedSet.delete(item);
        }
      });
      return updatedSet;
    });
  };

  const toggleValue = (value: T): Set<T> => {
    let newSet = new Set<T>();
    setSet((prevSet) => {
      const updatedSet = new Set<T>(prevSet);
      let itemFound = false;

      updatedSet.forEach((item) => {
        if (item.externalId === value.externalId) {
          itemFound = true;
          updatedSet.delete(item);
        }
      });

      if (!itemFound) {
        updatedSet.add(value);
      }

      newSet = updatedSet;

      return updatedSet;
    });

    return newSet;
  };

  const hasItem = (value: T) => {
    return Array.from(set).some((item) => item.externalId === value.externalId);
  };

  const clearSet = () => {
    setSet(() => new Set());
    // clear local storage too
    localStorage.removeItem(key);
  };

  return { set, addValue, removeById, toggleValue, hasItem, clearSet };
}
