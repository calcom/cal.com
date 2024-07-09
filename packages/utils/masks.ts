const validateCPF = (cpf: string) => {
  if (cpf.length !== 11) return false;

  const cpfArray = Array.from(cpf).map(Number);

  const [firstDigit, secondDigit] = cpfArray.slice(9);

  const isAllDigitsEqual = cpfArray.every((digit) => digit === cpfArray[0]);

  if (isAllDigitsEqual) return false;

  const calculateDigit = (slice: number) => {
    let sum = 0;
    let count = slice + 1;

    for (let i = 0; i < slice; i++) {
      sum += cpfArray[i] * count;
      count--;
    }

    const rest = sum % 11;

    return rest < 2 ? 0 : 11 - rest;
  };

  const firstDigitCalculated = calculateDigit(9);
  const secondDigitCalculated = calculateDigit(10);

  return firstDigit === firstDigitCalculated && secondDigit === secondDigitCalculated;
};

export const cpfMask = (value: string) => {
  const onlyNumbers = value.replace(/[^\d]/g, "");

  const cpfIsValid = validateCPF(onlyNumbers);

  const formatedCPF = onlyNumbers
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");

  return { isValid: cpfIsValid, value: formatedCPF };
};
