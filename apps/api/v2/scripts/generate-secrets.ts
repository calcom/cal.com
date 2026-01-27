import { generateSecret } from "@calcom/platform-libraries";

const [hashed, plain] = generateSecret();

console.log(`plain - ${plain}`);
console.log(`hashed - ${hashed}`);
