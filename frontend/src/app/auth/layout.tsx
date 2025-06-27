import api from "@/config/api-client";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

async function AuthPageLayout({ children }: Props) {
  const session = await api.auth.getSession();
  if (session) redirect("/");

  return <div>{children}</div>;
}

export default AuthPageLayout;
