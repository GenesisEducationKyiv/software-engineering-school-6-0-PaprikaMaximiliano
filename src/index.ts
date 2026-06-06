import "dotenv/config";
import { env } from "./platform/config.js";
import { buildApp } from "./app.js";

const app = await buildApp();

const host = "0.0.0.0";

try {
  await app.listen({ port: env.PORT, host });
  app.log.info({ port: env.PORT, host }, "server started");
} catch (error) {
  app.log.error(error, "failed to start server");
  process.exit(1);
}
