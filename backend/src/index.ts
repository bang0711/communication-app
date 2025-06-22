import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";

import { auth, OpenAPI } from "../config/auth";
import { prisma } from "../config/prisma-client";

const port = process.env.PORT || 8000;

const app = new Elysia()

  .use(
    cors({
      origin: process.env.ACCEPTED_ORIGINS?.split(",") || [
        "http://localhost:3000",
        "http://localhost:3001",
      ],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  )
  .use(
    swagger({
      documentation: {
        components: await OpenAPI.components,
        paths: await OpenAPI.getPaths(),
      },
      path: "/docs",
    })
  )
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        console.log("Headers:", headers);

        const token = extractToken(headers);
        console.log("Token:", token);
        const session = await prisma.session.findFirst({
          where: {
            token: token || "",
          },
        });
        console.log("Session from DB:", session);

        const check = await auth.api.getSession({
          headers,
        });
        console.log("Session:", check);
        return {
          user: {},
        };
      },
    },
  })
  .get(
    "/api",
    ({ user }) => {
      console.log("User:", user);
    },
    {
      auth: true,
    }
  )
  .get("/api/debug-session", async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    return { session };
  })
  .listen(port);

const isProduction = process.env.NODE_ENV === "production";
const prefix = "api";

console.log(
  `🦊 Server is running at ${isProduction ? "https://" : "http://"}${app.server?.hostname}:${app.server?.port}/${prefix}`
);

console.log(
  `🦊 Server documentation is running at ${isProduction ? "https://" : "http://"}${app.server?.hostname}:${app.server?.port}/docs`
);

const extractToken = (headers: Headers) => {
  const authHeader =
    headers.get("session_token") || headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  return null;
};
