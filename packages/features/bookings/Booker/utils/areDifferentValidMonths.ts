export const areDifferentValidMonths = (firstMonth: number, secondMonth: number) => {
  const isFirstMonthValid = Number.isFinite(firstMonth);
  const isSecondMonthValid = Number.isFinite(secondMonth);

  if (!isFirstMonthValid || !isSecondMonthValid) {
    return false;
  }

  if (firstMonth === secondMonth) {
    return false;
  }

  return true;
};
