export const validateEmail = (email: string) => {
  const emailRegex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  return !!email.toLowerCase().match(emailRegex);
};

export const validateName = (name: string): boolean => {
  if (name.length > 0) {
    const splitName = name.split(" ");
    return splitName.length > 1;
  }
  return false;
};

export const validateGroup = (group: string): boolean => {
  return (group.length > 0 && group.length < 2) || !isNaN(parseInt(group, 10));
};

export const validateCpf = (cpf: string) => {
  cpf = cpf.replace(/[\s.-]*/gim, "");
  if (
    !cpf ||
    cpf.length != 11 ||
    cpf == "00000000000" ||
    cpf == "11111111111" ||
    cpf == "22222222222" ||
    cpf == "33333333333" ||
    cpf == "44444444444" ||
    cpf == "55555555555" ||
    cpf == "66666666666" ||
    cpf == "77777777777" ||
    cpf == "88888888888" ||
    cpf == "99999999999"
  ) {
    return false;
  }
  let soma = 0;
  let resto;
  for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto == 10 || resto == 11) resto = 0;
  if (resto != parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto == 10 || resto == 11) resto = 0;
  return resto == parseInt(cpf.substring(10, 11));
};

export const validatePhone = (phone: string) => {
  const phoneRegex = /\(?\d{2}\)? ?9? ?\d{4}-?\d{4}/;

  return !!phone.match(phoneRegex);
};
