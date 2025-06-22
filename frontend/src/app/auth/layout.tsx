import { apiClient } from "@/config/api-client";

import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

async function AuthPageLayout({ children }: Props) {
  const test = await apiClient.get("/", {
    withCredentials: true,
  });
  console.log(test.data);
  return <div>{children}</div>;
}

export default AuthPageLayout;
