"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand";

import { createBookerStore, type BookerStore } from "./store";

const BookerStoreContext = createContext<StoreApi<BookerStore> | null>(null);

export interface BookerStoreProviderProps {
  children: ReactNode;
}

export const BookerStoreProvider = ({ children }: BookerStoreProviderProps) => {
  const storeRef = useRef<StoreApi<BookerStore>>();
  if (!storeRef.current) {
    storeRef.current = createBookerStore();
  }

  return <BookerStoreContext.Provider value={storeRef.current}>{children}</BookerStoreContext.Provider>;
};

export const useBookerStoreContext = <T,>(selector: (store: BookerStore) => T): T => {
  const bookerStoreContext = useContext(BookerStoreContext);

  if (!bookerStoreContext) {
    throw new Error("useBookerStoreContext must be used within BookerStoreProvider");
  }

  return useStore(bookerStoreContext, selector);
};
