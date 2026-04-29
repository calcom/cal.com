export function getSharedAvailabilitySlots(hostSlots: any[], guestSlots: any[]) {
  // إذا لم يكن هناك مواعيد للضيف، نعيد مواعيد المضيف كما هي
  if (!guestSlots || guestSlots.length === 0) return hostSlots;

  return hostSlots.filter((hSlot) => {
    const hStart = new Date(hSlot.start).getTime();
    const hEnd = new Date(hSlot.end).getTime();

    // نتحقق إذا كان هناك وقت متاح للضيف يغطي نفس فترة المضيف
    return guestSlots.some((gSlot) => {
      const gStart = new Date(gSlot.start).getTime();
      const gEnd = new Date(gSlot.end).getTime();
      // الشرط: موعد المضيف يجب أن يكون ضمن حدود موعد الضيف المتاح
      return hStart >= gStart && hEnd <= gEnd;
    });
  });
}
