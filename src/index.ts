import "dotenv/config";
import { env } from "./config.js";
import { buildApp } from "./app.js";

const app = await buildApp();

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error, "failed to start server");
  process.exit(1);
}
