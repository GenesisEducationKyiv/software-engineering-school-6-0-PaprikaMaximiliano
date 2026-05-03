import "node:http";

declare module "node:http" {
  interface IncomingMessage {
    __requestStartAt?: bigint;
  }
}
