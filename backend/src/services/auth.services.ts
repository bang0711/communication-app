import { t } from "elysia";

import crypto from "crypto";

import { prisma } from "../config/prisma";
import env from "../config/env";

export const socialLoginBody = t.Object({
  provider: t.Enum({
    google: "google",
    github: "github",
  }),
  callbackURL: t.String(),
});

export const socialLoginCallbackBody = t.Object({
  provider: t.Enum({
    google: "google",
    github: "github",
  }),
  code: t.String(),
  state: t.String(),
});

type SocialLoginResponse = {
  url: string;
  redirect: boolean;
};

type SocialLoginBody = typeof socialLoginBody.static;
type SocialLoginCallbackBody = typeof socialLoginCallbackBody.static;

export const socialLogin = async ({
  provider,
  callbackURL,
}: SocialLoginBody): Promise<SocialLoginResponse> => {
  let url = "";
  let clientId = "";
  let scope = "";
  const expiresAt = Date.now() + 1000 * 60 * 1; // 1 minute

  const verification = await prisma.verification.create({
    data: {
      value: JSON.stringify({
        callbackURL,
        expiresAt,
        ...(provider === "google" && {
          codeVerifier: crypto.randomBytes(32).toString("base64url"),
        }),
      }),
      expiresAt: new Date(expiresAt),
    },
  });

  let state = verification.identifier;

  switch (provider) {
    case "github":
      clientId = env.GITHUB_CLIENT_ID;
      scope = encodeURIComponent("read:user user:email");

      url = `https://github.com/login/oauth/authorize?response_type=code&client_id=${clientId}&state=${state}&scope=${scope}`;
      break;
    case "google":
      clientId = env.GOOGLE_CLIENT_ID;
      scope = encodeURIComponent("email profile openid");
      const codeChallengeMethod = "S256";

      const codeVerifier = crypto.randomBytes(32).toString("base64url");

      const codeChallenge = crypto
        .createHash("sha256")
        .update(codeVerifier)
        .digest()
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const redirectURI = env.BASE_URL + "/api/auth/callback/google";

      // Save correct codeVerifier in verification.value
      const googleVerification = await prisma.verification.create({
        data: {
          value: JSON.stringify({
            callbackURL,
            expiresAt,
            codeVerifier, // ← the correct one
          }),
          expiresAt: new Date(expiresAt),
        },
      });

      state = googleVerification.identifier;

      url = `https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=${clientId}&state=${state}&scope=${scope}&redirect_uri=${encodeURIComponent(
        redirectURI
      )}&code_challenge_method=${codeChallengeMethod}&code_challenge=${codeChallenge}`;
      break;
  }

  return {
    url,
    redirect: true,
  };
};

// Helper to find or create user by email
const findOrCreateUser = async ({
  email,
  name,
  emailVerified,
  image,
}: {
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
}) => {
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.user.create({
      data: { email, name, emailVerified, image: image || null },
    });
  }
  return user;
};

export const socialLoginCallback = async ({
  provider,
  code,
  state,
}: SocialLoginCallbackBody) => {
  const verification = await prisma.verification.findUnique({
    where: { identifier: state },
  });

  if (!verification || verification.expiresAt < new Date()) {
    throw new Error("Invalid or expired state parameter");
  }

  const value = JSON.parse(verification.value);

  let user = null;

  const { callbackURL } = value;

  switch (provider) {
    case "github":
      {
        const tokenRes = await fetch(
          "https://github.com/login/oauth/access_token",
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              client_id: env.GITHUB_CLIENT_ID,
              client_secret: env.GITHUB_CLIENT_SECRET,
              code,
            }),
          }
        );
        const { access_token } = await tokenRes.json();
        if (!access_token)
          throw new Error("Failed to get access token from GitHub");

        // Fetch user and email in parallel
        const [userRes, emailRes] = await Promise.all([
          fetch("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${access_token}` },
          }),
          fetch("https://api.github.com/user/emails", {
            headers: { Authorization: `Bearer ${access_token}` },
          }),
        ]);

        if (!userRes.ok || !emailRes.ok) {
          throw new Error("Failed to fetch user or emails from GitHub");
        }

        const userData = await userRes.json();
        const emailData = await emailRes.json();

        const primary =
          Array.isArray(emailData) && emailData.length > 0
            ? emailData.find((e) => e.primary && e.verified)
            : null;
        const email = primary?.email || userData.email;

        if (!email) throw new Error("No email found from GitHub");

        user = await findOrCreateUser({
          email,
          name: userData.name || userData.login || email,
          emailVerified: !!primary?.verified,
          image: userData.avatar_url,
        });
      }
      break;
    case "google":
      {
        const { codeVerifier } = value;

        if (!codeVerifier) {
          throw new Error("Missing code verifier for Google OAuth");
        }

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            grant_type: "authorization_code",
            redirect_uri: env.BASE_URL + "/api/auth/callback/google",
            code_verifier: codeVerifier,
          }),
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) {
          console.error("Google token error:", tokenData);
          throw new Error(
            `Failed to get access token from Google: ${tokenData.error || "Unknown error"}`
          );
        }

        const { access_token } = tokenData;

        if (!access_token) {
          throw new Error("No access token received from Google");
        }

        const userRes = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: { Authorization: `Bearer ${access_token}` },
          }
        );

        if (!userRes.ok) {
          throw new Error("Failed to fetch user info from Google");
        }

        const userData = await userRes.json();

        if (!userData.email) throw new Error("No email found from Google");

        user = await findOrCreateUser({
          email: userData.email,
          name: userData.name || userData.email,
          emailVerified: !!userData.verified_email,
          image: userData.picture,
        });
      }

      break;
  }

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
    },
  });

  return { session, callbackURL };
};

export const getSession = async (token: string) => {
  const session = await prisma.session.findUnique({
    where: { token, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      token: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
        },
      },
    },
  });
  if (!session) return null;

  const user = session.user;

  return {
    session,
    user,
  };
};
