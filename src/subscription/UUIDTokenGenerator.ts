import { randomUUID } from "node:crypto";
import { ITokenGenerator } from "./ports/ITokenGenerator";

export class UUIDTokenGenerator implements ITokenGenerator {
  generate(): string {
    return randomUUID();
  }
}
