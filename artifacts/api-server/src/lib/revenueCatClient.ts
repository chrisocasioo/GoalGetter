import { ReplitConnectors } from "@replit/connectors-sdk";
import { createClient } from "@replit/revenuecat-sdk/client";

let _client: ReturnType<typeof createClient> | null = null;

export function getRevenueCatClient() {
  if (_client) return _client;

  const connectors = new ReplitConnectors();

  // The RC SDK passes a Request object (or string/URL) as the first argument.
  // We cast to `any` here because `RequestInfo` is a DOM global not present in
  // the Node es2022 lib; at runtime we always receive a Request object.
  _client = createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch: async (input: any, _init?: any): Promise<Response> => {
      const req: Request = input instanceof Request ? input : new Request(String(input), _init);

      const parsedUrl = new URL(req.url);
      const path = parsedUrl.pathname + parsedUrl.search;

      let body: string | undefined;
      if (req.method !== "GET" && req.method !== "HEAD") {
        try {
          body = await req.text();
        } catch {
          body = undefined;
        }
      }

      const headersObj: Record<string, string> = {};
      req.headers.forEach((value: string, key: string) => {
        headersObj[key] = value;
      });

      const response = await connectors.proxy("revenuecat", path, {
        method: req.method,
        body: body || undefined,
        headers: Object.keys(headersObj).length > 0 ? headersObj : undefined,
      });

      return response as Response;
    },
  });

  return _client;
}
