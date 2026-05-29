import type { LightMyRequestResponse } from "fastify";
import { API_KEY, TEST_EMAIL, TEST_REPO } from "../constants";
import type { IntegrationTestContext } from "../setup/testApp";

type ApiRequestOptions = {
  method: "GET" | "POST";
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  includeApiKey?: boolean;
};

function apiKeyHeaders(): Record<string, string> {
  return {
    "x-api-key": API_KEY,
  };
}

export async function apiRequest(
  ctx: IntegrationTestContext,
  options: ApiRequestOptions,
): Promise<LightMyRequestResponse> {
  const app = await ctx.appPromise;
  const includeApiKey = options.includeApiKey ?? true;

  return app.inject({
    method: options.method,
    url: options.url,
    body: options.body as never,
    headers: {
      ...(includeApiKey ? apiKeyHeaders() : {}),
      ...options.headers,
    },
  });
}

export async function metricsRequest(ctx: IntegrationTestContext): Promise<LightMyRequestResponse> {
  return apiRequest(ctx, {
    method: "GET",
    url: "/metrics",
    includeApiKey: false,
  });
}

export function parseJsonBody<T>(response: LightMyRequestResponse): T {
  return JSON.parse(response.body) as T;
}

type SubscribeOverrides = Partial<{
  email: string;
  repo: string;
}>;

export async function subscribe(
  ctx: IntegrationTestContext,
  overrides: SubscribeOverrides = {},
): Promise<LightMyRequestResponse> {
  return apiRequest(ctx, {
    method: "POST",
    url: "/api/subscribe",
    body: {
      email: overrides.email ?? TEST_EMAIL,
      repo: overrides.repo ?? TEST_REPO,
    },
  });
}
