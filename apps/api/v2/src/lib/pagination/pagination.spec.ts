import { getPagination, clamp } from "./pagination";

describe("getPagination", () => {
  it("handles the first page correctly", () => {
    const pagination = getPagination({ skip: 0, take: 10, totalCount: 35 });
    expect(pagination).toEqual({
      returnedItems: 10,
      totalItems: 35,
      itemsPerPage: 10,
      remainingItems: 25,
      currentPage: 1,
      totalPages: 4,
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it("handles a middle page correctly", () => {
    const pagination = getPagination({ skip: 10, take: 10, totalCount: 35 });
    expect(pagination).toEqual({
      returnedItems: 10,
      totalItems: 35,
      itemsPerPage: 10,
      remainingItems: 15,
      currentPage: 2,
      totalPages: 4,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it("handles the last page when it is not completely full", () => {
    const pagination = getPagination({ skip: 30, take: 10, totalCount: 35 });
    expect(pagination).toEqual({
      returnedItems: 5,
      totalItems: 35,
      itemsPerPage: 10,
      remainingItems: 0,
      currentPage: 4,
      totalPages: 4,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it("clamps skip values that exceed the total item count", () => {
    const pagination = getPagination({ skip: 40, take: 10, totalCount: 35 });
    expect(pagination).toEqual({
      returnedItems: 0,
      totalItems: 35,
      itemsPerPage: 10,
      remainingItems: 0,
      currentPage: 4,
      totalPages: 4,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it("works when itemsPerPage (take) is zero", () => {
    const pagination = getPagination({ skip: 0, take: 0, totalCount: 35 });
    expect(pagination).toEqual({
      returnedItems: 0,
      totalItems: 35,
      itemsPerPage: 0,
      remainingItems: 35,
      currentPage: 0,
      totalPages: 0,
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it("works when the collection is empty", () => {
    const pagination = getPagination({ skip: 0, take: 10, totalCount: 0 });
    expect(pagination).toEqual({
      returnedItems: 0,
      totalItems: 0,
      itemsPerPage: 10,
      remainingItems: 0,
      currentPage: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });
});

describe("clamp", () => {
  it("returns the value unchanged when it is inside the range", () => {
    expect(clamp({ value: 5, min: 1, max: 10 })).toBe(5);
  });

  it("clamps values below the minimum", () => {
    expect(clamp({ value: -3, min: 0, max: 10 })).toBe(0);
  });

  it("clamps values above the maximum", () => {
    expect(clamp({ value: 42, min: 0, max: 10 })).toBe(10);
  });
});
