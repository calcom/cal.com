import { hash, compare, getRounds } from "bcryptjs";
import { PasswordAuthenticator } from "./PasswordAuthenticator";

export class BcryptPassworAuthenticator implements PasswordAuthenticator {
  private static readonly ROUNDS: number = 12;

  public async generate(plaintext: string): Promise<string> {
    return hash(plaintext, BcryptPassworAuthenticator.ROUNDS);
  }

  public async compare(plaintext: string, hash: string): Promise<boolean> {
    return compare(plaintext, hash);
  }

  public isUpgradeRequired(hash: string): boolean {
    return getRounds(hash) < BcryptPassworAuthenticator.ROUNDS;
  }
}
