import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";

import env from "./config/env";

import { Routes } from "./routes";

const port = env.PORT || 8000;

const app = new Elysia()
  .use(
    cors({
      origin: env.ACCEPTED_ORIGINS?.split(",") || [
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
        info: {
          title: "App API",
          description: "API documentation for App",
          version: "1.0.0",
          license: {
            name: "MIT",
          },
        },
      },
      path: "/docs",
    })
  )
  .use(Routes)
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
