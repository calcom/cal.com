export const preprocessNameFieldDataWithVariant = (
  variantName: "fullName" | "firstAndLastName",
  value: string | Record<"firstName" | "lastName", string>
) => {
  let newValue: string | Record<"firstName" | "lastName", string>;
  // We expect an object here, but if we get a string, then we will try to transform it into the appropriate object
  if (variantName === "firstAndLastName") {
    if (typeof value === "string") {
      try {
        // Support name={"firstName": "John", "lastName": "Johny Janardan"} for prefilling
        newValue = JSON.parse(value);
      } catch (e) {
        // Support name="John Johny Janardan" to be filled as firstName="John" and lastName="Johny Janardan"
        const parts = value.split(" ").map((part) => part.trim());
        const firstName = parts[0];
        const lastName = parts.slice(1).join(" ");
        value = { firstName, lastName };
        // If the value is not a valid JSON, then we will just use the value as is as it can be the full name directly
        newValue = value;
      }
    } else {
      newValue = value;
    }
    // We expect a string here, but if we get an object, then we will try to transform it into the appropriate string
  } else {
    if (typeof value !== "string") {
      newValue = value.firstName + " " + value.lastName;
    } else {
      newValue = value;
    }
  }
  return newValue;
};
