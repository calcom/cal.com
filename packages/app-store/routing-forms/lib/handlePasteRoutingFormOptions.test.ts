import type { SelectOption } from "routing-forms/pages/form-edit/[...appPages]";
import { v4 as uuidv4 } from "uuid";
import { describe, it, expect, beforeEach } from "vitest";

import { handlePasteRoutingFormOptions } from "./handlePasteRoutingFormOptions";

describe("Testing list pasting (for lists greater than 1 item in length) on routing form single & multiple select option arrays", () => {
  let pasted2ItemList: SelectOption[];
  let pasted3ItemList: SelectOption[];
  let pasted4ItemList: SelectOption[];
  let pasted6ItemList: SelectOption[];
  let pasted8ItemList: SelectOption[];
  beforeEach(() => {
    pasted2ItemList = [
      { placeholder: "", value: "Apple", id: uuidv4() },
      { placeholder: "", value: "Pear", id: uuidv4() },
    ];
    pasted3ItemList = [...pasted2ItemList, { placeholder: "", value: "Banana", id: uuidv4() }];
    pasted4ItemList = [...pasted3ItemList, { placeholder: "", value: "Orange", id: uuidv4() }];
    pasted6ItemList = [
      ...pasted4ItemList,
      { placeholder: "", value: "Lemon", id: uuidv4() },
      { placeholder: "", value: "Grape", id: uuidv4() },
    ];
    pasted8ItemList = [
      ...pasted6ItemList,
      { placeholder: "", value: "Mango", id: uuidv4() },
      { placeholder: "", value: "Peach", id: uuidv4() },
    ];
  });
  describe("Testing with blank new options arrays with 4 empty placeholders only", () => {
    let initialOptions: SelectOption[];
    beforeEach(() => {
      initialOptions = [
        { placeholder: "< 10", value: "", id: uuidv4() },
        { placeholder: "10-100", value: "", id: uuidv4() },
        { placeholder: "100-500", value: "", id: uuidv4() },
        { placeholder: "> 500", value: "", id: uuidv4() },
      ];
    });

    it("pastes a 2 item list into a blank options array in position 1, overwriting placeholders 1 & 2", () => {
      const expectedOptions = [
        { placeholder: "", value: "Apple" },
        { placeholder: "", value: "Pear" },
        { placeholder: "100-500", value: "" },
        { placeholder: "> 500", value: "" },
      ];
      const updatedOptions = handlePasteRoutingFormOptions(pasted2ItemList, initialOptions, 0);
      expect(updatedOptions.map(({ id: _id, ...rest }) => rest)).toEqual(expectedOptions);
    });

    it("pastes a 2 item list into a blank options array in position 2, overwriting placeholders 2 & 3", () => {
      const expectedOptions = [
        { placeholder: "< 10", value: "" },
        { placeholder: "", value: "Apple" },
        { placeholder: "", value: "Pear" },
        { placeholder: "> 500", value: "" },
      ];
      const updatedOptions = handlePasteRoutingFormOptions(pasted2ItemList, initialOptions, 1);
      expect(updatedOptions.map(({ id: _id, ...rest }) => rest)).toEqual(expectedOptions);
    });

    it("pastes a 2 item list into a blank options array in position 3, overwriting placeholders 3 & 4", () => {
      const expectedOptions = [
        { placeholder: "< 10", value: "" },
        { placeholder: "10-100", value: "" },
        { placeholder: "", value: "Apple" },
        { placeholder: "", value: "Pear" },
      ];
      const updatedOptions = handlePasteRoutingFormOptions(pasted2ItemList, initialOptions, 2);
      expect(updatedOptions.map(({ id: _id, ...rest }) => rest)).toEqual(expectedOptions);
    });

    it("pastes a 2 item list into a blank options array in position 4, overwriting placeholder 4 & creating a new populated option", () => {
      const expectedOptions = [
        { placeholder: "< 10", value: "" },
        { placeholder: "10-100", value: "" },
        { placeholder: "100-500", value: "" },
        { placeholder: "", value: "Apple" },
        { placeholder: "", value: "Pear" },
      ];
      const updatedOptions = handlePasteRoutingFormOptions(pasted2ItemList, initialOptions, 3);
      expect(updatedOptions.map(({ id: _id, ...rest }) => rest)).toEqual(expectedOptions);
    });

    it("pastes a 3 item list into a blank options array in position 1, overwriting placeholders 1, 2 & 3", () => {
      const expectedOptions = [
        { placeholder: "", value: "Apple" },
        { placeholder: "", value: "Pear" },
        { placeholder: "", value: "Banana" },
        { placeholder: "> 500", value: "" },
      ];
      const updatedOptions = handlePasteRoutingFormOptions(pasted3ItemList, initialOptions, 0);
      expect(updatedOptions.map(({ id: _id, ...rest }) => rest)).toEqual(expectedOptions);
    });

    it("pastes a 3 item list into a blank options array in position 4, overwriting placeholder 4 & creating 2 new populated options", () => {
      const expectedOptions = [
        { placeholder: "< 10", value: "" },
        { placeholder: "10-100", value: "" },
        { placeholder: "100-500", value: "" },
        { placeholder: "", value: "Apple" },
        { placeholder: "", value: "Pear" },
        { placeholder: "", value: "Banana" },
      ];
      const updatedOptions = handlePasteRoutingFormOptions(pasted3ItemList, initialOptions, 3);
      expect(updatedOptions.map(({ id: _id, ...rest }) => rest)).toEqual(expectedOptions);
    });

    it("pastes a 4 item list into a blank options array in position 1, overwriting all placeholders", () => {
      const expectedOptions = [
        { placeholder: "", value: "Apple" },
        { placeholder: "", value: "Pear" },
        { placeholder: "", value: "Banana" },
        { placeholder: "", value: "Orange" },
      ];
      const updatedOptions = handlePasteRoutingFormOptions(pasted4ItemList, initialOptions, 0);
      expect(updatedOptions.map(({ id: _id, ...rest }) => rest)).toEqual(expectedOptions);
    });

    it("pastes a 4 item list into a blank options array in position 3, overwriting placeholders 3 & 4 & creating 1 new populated option", () => {
      const expectedOptions = [
        { placeholder: "< 10", value: "" },
        { placeholder: "10-100", value: "" },
        { placeholder: "", value: "Apple" },
        { placeholder: "", value: "Pear" },
        { placeholder: "", value: "Banana" },
        { placeholder: "", value: "Orange" },
      ];
      const updatedOptions = handlePasteRoutingFormOptions(pasted4ItemList, initialOptions, 2);
      expect(updatedOptions.map(({ id: _id, ...rest }) => rest)).toEqual(expectedOptions);
    });

    it("pastes an 8 item list into a blank options array in position 1, overwriting all placeholders & creating 4 new options", () => {
      const expectedOptions = [
        { placeholder: "", value: "Apple" },
        { placeholder: "", value: "Pear" },
        { placeholder: "", value: "Banana" },
        { placeholder: "", value: "Orange" },
        { placeholder: "", value: "Lemon" },
        { placeholder: "", value: "Grape" },
        { placeholder: "", value: "Mango" },
        { placeholder: "", value: "Peach" },
      ];
      const updatedOptions = handlePasteRoutingFormOptions(pasted8ItemList, initialOptions, 0);
      expect(updatedOptions.map(({ id: _id, ...rest }) => rest)).toEqual(expectedOptions);
    });

    it("pastes an 8 item list into a blank options array in position 3, overwriting placeholders 3 & 4 & creating 6 new prepopulated options", () => {
      const expectedOptions = [
        { placeholder: "< 10", value: "" },
        { placeholder: "10-100", value: "" },
        { placeholder: "", value: "Apple" },
        { placeholder: "", value: "Pear" },
        { placeholder: "", value: "Banana" },
        { placeholder: "", value: "Orange" },
        { placeholder: "", value: "Lemon" },
        { placeholder: "", value: "Grape" },
        { placeholder: "", value: "Mango" },
        { placeholder: "", value: "Peach" },
      ];
      const updatedOptions = handlePasteRoutingFormOptions(pasted8ItemList, initialOptions, 2);
      expect(updatedOptions.map(({ id: _id, ...rest }) => rest)).toEqual(expectedOptions);
    });
  });

  describe("Testing options arrays with user prepopulated options only", () => {
    it("pastes a 2 item list into a prepopulated options array in position 1, overwriting the first 2 options", () => {
      const initialOptions = [
        { placeholder: "", value: "Pineapple", id: uuidv4() },
        { placeholder: "", value: "Melon", id: uuidv4() },
        { placeholder: "", value: "Cherry", id: uuidv4() },
        { placeholder: "", value: "Kiwi", id: uuidv4() },
      ];
      const expectedOptions = [
        { placeholder: "", value: "Apple" },
        { placeholder: "", value: "Pear" },
        { placeholder: "", value: "Cherry" },
        { placeholder: "", value: "Kiwi" },
      ];
      const updatedOptions = handlePasteRoutingFormOptions(pasted2ItemList, initialOptions, 0);
      expect(updatedOptions.map(({ id: _id, ...rest }) => rest)).toEqual(expectedOptions);
    });

    it("pastes a 4 item list into the middle of a prepopulated options array, overwriting exactly 4 options", () => {
      const initialOptions = [
        { placeholder: "", value: "Pineapple", id: uuidv4() },
        { placeholder: "", value: "Melon", id: uuidv4() },
        { placeholder: "", value: "Cherry", id: uuidv4() },
        { placeholder: "", value: "Kiwi", id: uuidv4() },
        { placeholder: "", value: "Strawberry", id: uuidv4() },
        { placeholder: "", value: "Blueberry", id: uuidv4() },
      ];
      const expectedOptions = [
        { placeholder: "", value: "Pineapple" },
        { placeholder: "", value: "Apple" },
        { placeholder: "", value: "Pear" },
        { placeholder: "", value: "Banana" },
        { placeholder: "", value: "Orange" },
        { placeholder: "", value: "Blueberry" },
      ];
      const updatedOptions = handlePasteRoutingFormOptions(pasted4ItemList, initialOptions, 1);
      expect(updatedOptions.map(({ id: _id, ...rest }) => rest)).toEqual(expectedOptions);
    });

    it("pastes a 6 item list into the last option in a prepopulated options array, overwriting the last option & creating 5 new options", () => {
      const initialOptions = [
        { placeholder: "", value: "Pineapple", id: uuidv4() },
        { placeholder: "", value: "Melon", id: uuidv4() },
        { placeholder: "", value: "Cherry", id: uuidv4() },
        { placeholder: "", value: "Kiwi", id: uuidv4() },
      ];
      const expectedOptions = [
        { placeholder: "", value: "Pineapple" },
        { placeholder: "", value: "Melon" },
        { placeholder: "", value: "Cherry" },
        { placeholder: "", value: "Apple" },
        { placeholder: "", value: "Pear" },
        { placeholder: "", value: "Banana" },
        { placeholder: "", value: "Orange" },
        { placeholder: "", value: "Lemon" },
        { placeholder: "", value: "Grape" },
      ];
      const updatedOptions = handlePasteRoutingFormOptions(pasted6ItemList, initialOptions, 3);
      expect(updatedOptions.map(({ id: _id, ...rest }) => rest)).toEqual(expectedOptions);
    });
  });

  describe("Testing with mixed options arrays including empty placeholders & user prepopulated options", () => {
    it("pastes a 2 item list into the first (placeholder) option in a mixed options array, overwriting the first 2 options", () => {
      const initialOptions = [
        { placeholder: "< 10", value: "", id: uuidv4() },
        { placeholder: "10-100", value: "", id: uuidv4() },
        { placeholder: "", value: "Cherry", id: uuidv4() },
        { placeholder: "", value: "Kiwi", id: uuidv4() },
      ];
      const expectedOptions = [
        { placeholder: "", value: "Apple" },
        { placeholder: "", value: "Pear" },
        { placeholder: "", value: "Cherry" },
        { placeholder: "", value: "Kiwi" },
      ];
      const updatedOptions = handlePasteRoutingFormOptions(pasted2ItemList, initialOptions, 0);
      expect(updatedOptions.map(({ id: _id, ...rest }) => rest)).toEqual(expectedOptions);
    });

    it("pastes a 2 item list into the first (populated) option in a mixed options array, overwriting exactly 2 options", () => {
      const initialOptions = [
        { placeholder: "< 10", value: "", id: uuidv4() },
        { placeholder: "10-100", value: "", id: uuidv4() },
        { placeholder: "", value: "Cherry", id: uuidv4() },
        { placeholder: "", value: "Kiwi", id: uuidv4() },
      ];
      const expectedOptions = [
        { placeholder: "< 10", value: "" },
        { placeholder: "10-100", value: "" },
        { placeholder: "", value: "Apple" },
        { placeholder: "", value: "Pear" },
      ];
      const updatedOptions = handlePasteRoutingFormOptions(pasted2ItemList, initialOptions, 2);
      expect(updatedOptions.map(({ id: _id, ...rest }) => rest)).toEqual(expectedOptions);
    });
  });
});
