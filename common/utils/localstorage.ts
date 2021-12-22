export interface IBeneficiary {
  name: string;
  email: string;
  document: string;
  phone: string;
  notes?: string;
}

// ? SS stands for session storage
export const getSSBeneficiary = function getBeneficiaryFromSessionStorage(): IBeneficiary | undefined {
  const beneficiary = sessionStorage.getItem("beneficiary");

  if (beneficiary !== null) {
    return JSON.parse(beneficiary);
  }
};

export const setSSBeneficiary = function setBeneficiaryToSessionStorage(beneficiary: IBeneficiary): void {
  const beneficiaryString = JSON.stringify(beneficiary);

  sessionStorage.setItem("beneficiary", beneficiaryString);
};

export const removeSSBeneficiary = function clearBeneficiaryFromSessionStorage(): void {
  sessionStorage.removeItem("beneficiary");
};
