describe('RecurringSlotOverlapInvariants', () => {
  it('detects booking slot collision when interval starts before existing slot ends', () => {
    const slotA = { start: 100, end: 130 };
    const slotB = { start: 120, end: 150 };
    const isOverlap = slotA.start < slotB.end && slotB.start < slotA.end;
    expect(isOverlap).toBe(true);
  });
});
