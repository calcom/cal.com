import { words as randomWords } from "./words";

export function generateRandomText(): string {
  const words = randomWords;

  const randomLength = Math.floor(Math.random() * 20) + 5;
  let result = "";

  for (let i = 0; i < randomLength; i++) {
    const randomWord = words[Math.floor(Math.random() * words.length)];
    if (i === 0) {
      result += randomWord.charAt(0).toUpperCase() + randomWord.slice(1);
    } else {
      result += ` ${randomWord}`;
    }
  }

  result += ".";

  return result;
}
