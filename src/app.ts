import Fastify from "fastify";
import formbody from "@fastify/formbody";
import sensible from "@fastify/sensible";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { env } from "./config";
import type { BuildAppOptions } from "./composition/buildAppOptions";
import { createServices } from "./composition/createServices";
import { registerReleaseScanner } from "./composition/registerReleaseScanner";
import { errorHandler } from "./errorHandler";
import { createApiRoutesPlugin } from "./plugins/apiRoutesPlugin";
import { registerMetrics } from "./plugins/metricsPlugin";

export type { BuildAppOptions } from "./composition/buildAppOptions";

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: true,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(sensible);
  await app.register(formbody);

  app.setErrorHandler(errorHandler);

  await registerMetrics(app);

  const services = createServices(options);
  const apiKey = options.apiKey ?? env.API_KEY;

  await app.register(createApiRoutesPlugin(services.subscriptionService, apiKey), {
    prefix: "/api",
  });

  if (options.enableScanner !== false) {
    registerReleaseScanner(app, options, services);
  }

  return app;
}
