import type { ITokenGenerator } from "../../../src/subscription/ports/ITokenGenerator";
import { CONFIRM_TOKEN, UNSUBSCRIBE_TOKEN } from "../constants";

export class DeterministicTokenGenerator implements ITokenGenerator {
  private index = 0;

  generate(): string {
    const tokens = [CONFIRM_TOKEN, UNSUBSCRIBE_TOKEN];
    const token = tokens[this.index % tokens.length];
    this.index += 1;
    return token;
  }

  reset(): void {
    this.index = 0;
  }
}
