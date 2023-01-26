import type { Route } from "@endpts/types";

const users = [
  {
    id: "usr_123",
    email: "jane@example.com",
  },
  {
    id: "usr_456",
    email: "ana@example.com",
  },
];

export default {
  method: "GET",
  path: "/users/:id",
  async handler(req) {
    const user = users.find((u) => u.id === req.params.id);

    if (!user) {
      return new Response(null, { status: 404, statusText: "User not found" });
    }

    return new Response(JSON.stringify(user), {
      headers: new Headers({
        "Content-Type": "application/json",
      }),
    });
  },
} satisfies Route;
