"use server";

import { cookies } from "next/headers";

export const getCookies = async () => {
  const cookiesStore = await cookies();

  const betterAuthCookie = cookiesStore.get("auth-token.session_token");
  return {
    betterAuthCookie,
  };
};
