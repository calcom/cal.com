import type { Card } from "@pages/api/plain";
import usage from "@pages/api/plain/usage";

export const cardExamples: ((email: string, id: string, username: string) => Card)[] = [usage];
