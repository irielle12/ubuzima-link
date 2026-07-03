import { authHeader } from "./authApi";

import _BASE_URL from "./api";
const API_URL = _BASE_URL + "/referrals";

export async function createReturnReferral(
  referralId: number | string,
  data: {
    followUpInstructions: string;
    medicationsPrescribed?: string;
    nextAppointmentDate?: string;
    followUpUrgency?: string;
  }
) {
  const response = await fetch(`${API_URL}/${referralId}/return`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(data),
  });

  const json = await response.json();

  if (!response.ok) throw new Error(json.message);

  return json;
}

export async function getReturnReferral(referralId: number | string) {
  const response = await fetch(`${API_URL}/${referralId}/return`, {
    headers: { ...authHeader() },
  });

  if (response.status === 404) return null;

  const json = await response.json();

  if (!response.ok) throw new Error(json.message);

  return json;
}
