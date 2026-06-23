import "dotenv/config";
import { env } from "./platform/config.js";
import { buildApp } from "./app.js";
import { createScannerAccessGrpcServer } from "./modules/subscription/grpc/scannerAccessGrpcServer.js";

const { app, subscriptionModule } = await buildApp();

const host = "0.0.0.0";

let grpcServer: ReturnType<typeof createScannerAccessGrpcServer> | null = null;

if (env.GRPC_ENABLED) {
  grpcServer = createScannerAccessGrpcServer(
    subscriptionModule.scannerAccessService,
    env.INTERNAL_API_KEY,
    env.GRPC_PORT,
  );
}

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "shutting down");

  if (grpcServer) {
    await grpcServer.stop();
  }

  await app.close();
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

try {
  await app.listen({ port: env.PORT, host });
  app.log.info({ port: env.PORT, host }, "server started");

  if (grpcServer) {
    await grpcServer.start();
    app.log.info({ port: env.GRPC_PORT }, "gRPC scanner access server started");
  }
} catch (error) {
  app.log.error(error, "failed to start server");
  process.exit(1);
}
