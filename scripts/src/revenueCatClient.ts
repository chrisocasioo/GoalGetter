import { ReplitConnectors } from "@replit/connectors-sdk";
import { createClient } from "@replit/revenuecat-sdk/client";

export async function getUncachableRevenueCatClient() {
  const connectors = new ReplitConnectors();

  const client = createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    fetch: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      // openapi-fetch passes a single Request object; extract everything from it
      const req = input instanceof Request ? input : new Request(input as string, init);

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
      req.headers.forEach((value, key) => {
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

  return client;
}
