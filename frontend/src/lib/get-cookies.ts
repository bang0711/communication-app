"use server";

import { cookies } from "next/headers";

export const getCookies = async () => {
  const cookiesStore = await cookies();

  const token = cookiesStore.get("token");

  return {
    token,
  };
};
