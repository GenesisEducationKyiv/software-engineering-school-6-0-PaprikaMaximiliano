import { Server, ServerCredentials } from "@grpc/grpc-js";
import {
  ScannerAccessServiceService,
  type ScannerAccessServiceServer,
} from "@/gen/scanner/v1/scanner_access";
import type { ScannerAccessService } from "../application/ScannerAccessService";
import { createScannerAccessGrpcHandlers } from "./scannerAccessGrpcHandlers";

export type ScannerAccessGrpcServer = {
  server: Server;
  start(): Promise<void>;
  stop(): Promise<void>;
};

export function createScannerAccessGrpcServer(
  service: ScannerAccessService,
  internalApiKey: string | null | undefined,
  port: number,
  host = "0.0.0.0",
): ScannerAccessGrpcServer {
  const handlers = createScannerAccessGrpcHandlers(service, internalApiKey);
  const server = new Server();

  server.addService(ScannerAccessServiceService, handlers as unknown as ScannerAccessServiceServer);

  return {
    server,
    start() {
      return new Promise((resolve, reject) => {
        server.bindAsync(
          `${host}:${port}`,
          ServerCredentials.createInsecure(),
          (error, _boundPort) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          },
        );
      });
    },
    stop() {
      return new Promise((resolve, reject) => {
        server.tryShutdown((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
}
