import API_URL from "./api";
import { authHeader } from "./authApi";

export interface PatientDuplicate {
  id: number;
  patient_number: string;
  national_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  gender: string;
}

export async function createPatient(
  patient: any
) {
  const response =
    await fetch(
      `${API_URL}/patients`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          ...authHeader(),
        },
        body: JSON.stringify(
          patient
        ),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    const err: any = new Error(data.message);
    err.status = response.status;
    if (response.status === 409 && data.existingPatient) {
      err.existingPatient = data.existingPatient;
    }
    throw err;
  }

  return data;
}

export async function getPatients() {
  const response =
    await fetch(
      `${API_URL}/patients`,
      { headers: { ...authHeader() } }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  return data;
}

export async function searchPatients(
  search: string
) {
  const response =
    await fetch(
      `${API_URL}/patients/search?q=${encodeURIComponent(
        search
      )}`,
      { headers: { ...authHeader() } }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  return data;
}

export async function getPatientById(
  id: number | string
) {
  const response =
    await fetch(
      `${API_URL}/patients/${id}`,
      { headers: { ...authHeader() } }
    );

  const data =
    await response.json();

  if (!response.ok) {
    const err: any = new Error(data.message);
    err.status = response.status;
    throw err;
  }

  return data;
}

export async function updatePatient(
  id: number | string,
  patient: any
) {
  const response =
    await fetch(
      `${API_URL}/patients/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify(patient),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  return data;
}

export async function getPatientReferrals(
  id: number | string
) {
  const response =
    await fetch(
      `${API_URL}/patients/${id}/referrals`,
      { headers: { ...authHeader() } }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  return data;
}