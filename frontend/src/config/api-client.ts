import { AuthApi } from "@/api-handler/auth";

class ApiClient {
  public readonly auth: AuthApi;

  constructor() {
    this.auth = new AuthApi();
  }
}

export const api = new ApiClient();
export default api;
