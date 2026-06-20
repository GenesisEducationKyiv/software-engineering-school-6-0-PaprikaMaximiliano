import Fastify from "fastify";
import formbody from "@fastify/formbody";
import sensible from "@fastify/sensible";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { env } from "./platform/config";
import type { BuildAppOptions } from "./composition/buildAppOptions";
import { createSubscriptionModule } from "./composition/createSubscriptionModule";
import { createScannerInternalPlugin } from "./modules/subscription/api/scannerInternalPlugin";
import { errorHandler } from "./platform/http/errorHandler";
import { registerMetrics } from "./platform/http/metricsPlugin";
import { createLoggerConfig } from "./platform/logger/loggerConfig";

export type { BuildAppOptions } from "./composition/buildAppOptions";

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger:
      options.logger ??
      createLoggerConfig({
        level: env.LOG_LEVEL,
        pretty: env.LOG_PRETTY ?? process.env.NODE_ENV !== "production",
      }),
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(sensible);
  await app.register(formbody);

  app.setErrorHandler(errorHandler);

  await registerMetrics(app);

  const subscriptionModule = createSubscriptionModule(options);

  await app.register(subscriptionModule.apiPlugin, {
    prefix: "/api",
  });

  await app.register(
    createScannerInternalPlugin(subscriptionModule.scannerAccessService, env.INTERNAL_API_KEY),
    {
      prefix: "/internal/scanner",
    },
  );

  app.addHook("onClose", async () => {
    await subscriptionModule.close();
  });

  return app;
}
