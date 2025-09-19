import { userServiceApi } from "./api";

export type AdminUserStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";

export interface AdminUser {
  id: string | number;
  name: string;
  email: string;
  role: string;
  status?: AdminUserStatus | string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface CreateAdminUserPayload {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateAdminUserPayload {
  name: string;
  email: string;
  role: string;
  password?: string;
  status?: AdminUserStatus | string;
}

export async function listAdminUsers(params?: {
  q?: string;
  role?: string;
  status?: string;
}) {
  const { data } = await userServiceApi.get<AdminUser[]>("/api/admin/users", {
    params,
    withCredentials: true,
  });

  return data;
}

export async function createAdminUser(payload: CreateAdminUserPayload) {
  const { data } = await userServiceApi.post<AdminUser>(
    "/api/admin/users",
    payload,
    {
      withCredentials: true,
    }
  );

  return data;
}

export async function updateAdminUser(
  id: string | number,
  payload: UpdateAdminUserPayload
) {
  const { data } = await userServiceApi.put<AdminUser>(
    `/api/admin/users/${id}`,
    payload,
    {
      withCredentials: true,
    }
  );

  return data;
}

export async function deleteAdminUser(id: string | number) {
  await userServiceApi.delete(`/api/admin/users/${id}`, {
    withCredentials: true,
  });
}
