import Elysia, { t } from "elysia";
import jwt from "@elysiajs/jwt";

import {
  getSession,
  socialLogin,
  socialLoginBody,
  socialLoginCallback,
} from "../services/auth.services";

import env from "../config/env";

type JwtPayload = {
  id: string;
  token: string; // sessionToken
};

export const AuthRoutes = new Elysia({
  prefix: "/auth",
  tags: ["Auth"],
})
  .use(
    jwt({
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
    })
  )
  .get("/get-session", async ({ jwt, headers: { authorization }, status }) => {
    if (!authorization) {
      return status(401, "Token is required for authentication");
    }

    const match = authorization.match(/Bearer (.+)/);
    if (!match) {
      return status(401, "Invalid token format");
    }

    const verified = await jwt.verify(match[1]);
    if (!verified) {
      return null;
    }

    const payload = verified as unknown as JwtPayload;

    const { token: sessionToken } = payload;

    return await getSession(sessionToken);
  })
  .post(
    "/sign-in/social",
    async ({ body }) => {
      return await socialLogin(body);
    },
    {
      body: socialLoginBody,
    }
  )
  .get(
    "/callback/:provider",
    async ({
      params: { provider },
      query: { code, state },
      jwt,
      cookie: { token },
      redirect,
    }) => {
      try {
        const res = await socialLoginCallback({
          provider,
          code,
          state,
        });

        if (!res) {
          throw new Error("User not found or social login failed");
        }

        const { session, callbackURL } = res;

        const payload = await jwt.sign({
          id: session.id,
          token: session.token,
          exp: session.expiresAt.getTime() / 1000,
        });

        token.set({
          value: payload,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          expires: session.expiresAt,
          maxAge: session.expiresAt.getTime() - Date.now(),
        });

        return redirect(callbackURL);
      } catch (error) {
        console.error("Error in social login callback:", error);
        throw new Error("Social login callback failed");
      }
    },
    {
      params: t.Object({
        provider: t.Union([t.Literal("google"), t.Literal("github")]),
      }),
      query: t.Object({
        code: t.String(),
        state: t.String(),
      }),
    }
  );
