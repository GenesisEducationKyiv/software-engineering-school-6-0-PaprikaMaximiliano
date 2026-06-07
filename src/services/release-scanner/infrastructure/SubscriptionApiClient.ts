export class SubscriptionApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async get(path: string): Promise<Response> {
    return this.fetchFn(`${this.baseUrl}${path}`, {
      headers: {
        "x-api-key": this.apiKey,
      },
    });
  }

  async patch(path: string, body: unknown): Promise<Response> {
    return this.fetchFn(`${this.baseUrl}${path}`, {
      method: "PATCH",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }
}
