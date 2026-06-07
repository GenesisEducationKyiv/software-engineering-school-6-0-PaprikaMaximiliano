import { randomUUID } from "node:crypto";
import type { ITokenGenerator } from "./ports/ITokenGenerator";

export class UUIDTokenGenerator implements ITokenGenerator {
  generate(): string {
    return randomUUID();
  }
}
