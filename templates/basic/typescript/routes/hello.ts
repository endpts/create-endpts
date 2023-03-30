import type { Route } from "@endpts/types";

export default {
  method: "GET",
  path: "/hello",
  async handler(req) {
    const name = req.query.get("name") || "stranger";

    return new Response(`Hello, ${name}!`);
  },
} satisfies Route;
