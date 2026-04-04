import { apiGet, apiPost } from "./http";

export type AuthUser = {
  id: string;
  email: string;
  role: "ADMIN" | "ARTIST";
  artistId: string | null;
};

export async function login(email: string, password: string) {
  return apiPost<AuthUser, { email: string; password: string }>("/auth/login", {
    email,
    password,
  });
}

export async function logout() {
  return apiPost<{ ok: true }, Record<string, never>>("/auth/logout", {});
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const user = await apiGet<AuthUser>("/auth/me");
    return user;
  } catch {
    return null;
  }
}

