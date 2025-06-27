import { API_ENDPOINTS } from "@/api-endpoints";

import { apiInstance } from "@/config/axios-instance";

type SocialLoginBody = {
  provider: "google" | "github";
  callbackURL: string;
};
type SocialLoginResponse = {
  redirect: boolean;
  url: string;
};

export class AuthApi {
  async socialLogin(body: SocialLoginBody): Promise<SocialLoginResponse> {
    const { provider, callbackURL } = body;

    const { data } = await apiInstance.post<SocialLoginResponse>(
      API_ENDPOINTS.AUTH.SOCIAL_LOGIN,
      {
        provider,
        callbackURL,
      },
    );

    return data;
  }

  async getSession() {
    const { data } = await apiInstance.get(API_ENDPOINTS.AUTH.GET_SESSION);

    return data;
  }
}
