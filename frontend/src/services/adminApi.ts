import { authHeader } from "./authApi";

import _BASE_URL from "./api";
const API_URL = _BASE_URL + "/admin";

async function handle(response: Response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export async function getFacilities() {
  const response = await fetch(`${API_URL}/facilities`, {
    headers: { ...authHeader() },
  });
  return handle(response);
}

export async function getFacilitiesBin() {
  const response = await fetch(`${API_URL}/facilities?bin=true`, {
    headers: { ...authHeader() },
  });
  return handle(response);
}

export async function createFacility(facility: any) {
  const response = await fetch(`${API_URL}/facilities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(facility),
  });

  return handle(response);
}

export async function updateFacility(
  id: number | string,
  facility: any
) {
  const response = await fetch(`${API_URL}/facilities/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(facility),
  });

  return handle(response);
}

export async function deleteFacility(id: number | string) {
  const response = await fetch(`${API_URL}/facilities/${id}/deactivate`, {
    method: "PATCH",
    headers: { ...authHeader() },
  });
  return handle(response);
}

export async function restoreFacility(id: number | string) {
  const response = await fetch(`${API_URL}/facilities/${id}/restore`, {
    method: "PATCH",
    headers: { ...authHeader() },
  });
  return handle(response);
}

export async function permanentDeleteFacility(id: number | string) {
  const response = await fetch(`${API_URL}/facilities/${id}`, {
    method: "DELETE",
    headers: { ...authHeader() },
  });
  return handle(response);
}

export async function getUsers(facilityId?: number | string) {
  const url = facilityId
    ? `${API_URL}/users?facilityId=${facilityId}`
    : `${API_URL}/users`;
  const response = await fetch(url, { headers: { ...authHeader() } });
  return handle(response);
}

export async function getUsersBin(facilityId?: number | string) {
  const url = facilityId
    ? `${API_URL}/users?bin=true&facilityId=${facilityId}`
    : `${API_URL}/users?bin=true`;
  const response = await fetch(url, { headers: { ...authHeader() } });
  return handle(response);
}

export async function createUser(user: any) {
  const response = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(user),
  });

  return handle(response);
}

export async function updateUser(
  id: number | string,
  user: any
) {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(user),
  });

  return handle(response);
}

export async function resetUserPassword(id: number | string, password: string) {
  const response = await fetch(`${API_URL}/users/${id}/reset-password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ password }),
  });
  return handle(response);
}

export async function deleteUser(id: number | string) {
  const response = await fetch(`${API_URL}/users/${id}/deactivate`, {
    method: "PATCH",
    headers: { ...authHeader() },
  });
  return handle(response);
}

export async function restoreUser(id: number | string) {
  const response = await fetch(`${API_URL}/users/${id}/restore`, {
    method: "PATCH",
    headers: { ...authHeader() },
  });
  return handle(response);
}

export async function permanentDeleteUser(id: number | string) {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: "DELETE",
    headers: { ...authHeader() },
  });
  return handle(response);
}
