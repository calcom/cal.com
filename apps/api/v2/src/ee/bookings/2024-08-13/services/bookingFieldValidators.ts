import { isValidPhoneNumber } from "libphonenumber-js";

function isEmail(value: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

function isValidUrl(value: string) {
  const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:[0-9]+)?(\/[^\s]*)?$/;
  return urlRegex.test(value);
}

export const validators = {
  text: (value: string | undefined) => {
    if (!value) {
      throw new Error("Invalid text");
    }
    return value;
  },

  textarea: (value: string | undefined) => {
    if (!value) {
      throw new Error("Invalid textarea");
    }
    return value;
  },

  email: (value: string | undefined) => {
    if (!value || !isEmail(value)) {
      throw new Error("Invalid email address");
    }
    return value;
  },

  phone: (value: string | undefined) => {
    if (!value || !isValidPhoneNumber(value)) {
      throw new Error("Invalid phone number");
    }
    return value;
  },

  url: (value: string | undefined) => {
    if (!value || !isValidUrl(value)) {
      throw new Error("Invalid URL");
    }
    return value;
  },

  number: (value: string | undefined) => {
    if (!value || isNaN(Number(value))) {
      throw new Error("Invalid number");
    }
    return Number(value);
  },

  boolean: (value: string | undefined) => {
    if (!value) {
      throw new Error("Invalid boolean");
    }
    return value;
  },

  address: (value: string | undefined) => {
    if (!value) {
      throw new Error("Invalid address");
    }
    return value;
  },

  select: (value: string | undefined, options: { value: string }[] | undefined) => {
    if (!options?.some((option) => option.value === value)) {
      throw new Error(`Invalid selection`);
    }
    return value;
  },

  multiselect: (value: string | undefined, options: { value: string }[] | undefined) => {
    if (!options?.some((option) => option.value === value)) {
      throw new Error(`Invalid selection`);
    }
    return value;
  },

  checkbox: (value: string | undefined) => {
    if (!value) {
      throw new Error("Invalid checkbox");
    }
    return value;
  },

  radio: (value: string | undefined) => {
    if (!value) {
      throw new Error("Invalid radio");
    }
    return value;
  },

  radioInput: (value: string | undefined) => {
    if (!value) {
      throw new Error("Invalid radio input");
    }
    return value;
  },

  multiemail: (value: string | undefined) => {
    if (!value) {
      throw new Error("Invalid email list");
    }
    const emails = value.split(",").map((email) => email.trim());
    if (!emails.every(isEmail)) {
      throw new Error("Invalid email address in list");
    }
    return emails;
  },
};
