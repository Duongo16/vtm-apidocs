import { userServiceApi } from "./api";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface LoginResponse {
  user: User;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await userServiceApi.post(
      "/api/auth/login",
      { email, password },
      {
        withCredentials: true,
      }
    );

    return response.data as LoginResponse;
  },

  async register(
    name: string,
    email: string,
    password: string,
    role: string
  ): Promise<void> {
    await userServiceApi.post("/api/auth/register", {
      name,
      email,
      password,
      role,
    });
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await userServiceApi.get("/api/auth/me", {
        withCredentials: true,
      });
      if(!response){
        return null;
      }
      return response.data as User;
    } catch (err: any) {
      return null;
    }
  },

  async logout(): Promise<void> {
    await userServiceApi.post(
      "/api/auth/logout",
      {},
      {
        withCredentials: true,
      }
    );
  },
};
