import jwt from "@elysiajs/jwt";
import Elysia from "elysia";

import env from "../config/env";
import { prisma } from "../config/prisma";

// Define the type for the JWT payload
type JwtPayload = {
  id: string;
  token: string; // sessionToken
};

export const authMacro = new Elysia()
  .use(
    jwt({
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
    })
  )
  .macro({
    auth: {
      async resolve({ status, jwt, headers: { authorization } }) {
        if (!authorization) {
          return status(401, "Token is required for authentication");
        }

        const jwtToken = extractTokenFromHeader(authorization);

        if (!jwtToken) {
          return status(401, "Invalid token format");
        }

        // Use the defined type for the payload
        const verified = await jwt.verify(jwtToken);

        if (!verified) {
          return status(401, "Invalid token");
        }

        const payload = verified as unknown as JwtPayload;

        const { token: sessionToken } = payload;

        const res = await prisma.session.findUnique({
          where: {
            token: sessionToken,
          },
          select: {
            user: {
              select: {
                id: true,
              },
            },
          },
        });

        if (!res) {
          return status(401, "Session not found or expired");
        }

        const { user } = res;

        return {
          user,
        };
      },
    },
  });

export const extractTokenFromHeader = (token: string) => {
  if (!token) return null;

  const match = token.match(/Bearer (.+)/);

  return match ? match[1] : null;
};
