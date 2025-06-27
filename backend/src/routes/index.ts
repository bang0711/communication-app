import Elysia from "elysia";

import { AuthRoutes } from "./auth";

export const Routes = new Elysia({
  prefix: "/api",
  tags: ["API"],
}).use(AuthRoutes)
