import API_URL from "./api";

export async function getHospitals() {

  const response =
    await fetch(
      `${API_URL}/facilities`
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

export async function getHospitalCapacity(facilityId: number | string) {
  const response = await fetch(
    `http://localhost:5000/api/facilities/${facilityId}/capacity`
  );

  const data = await response.json();

  if (!response.ok) throw new Error(data.message);

  return data;
}

export async function updateHospitalCapacity(
  facilityId: number | string,
  status: { Emergency: string; Urgent: string; Routine: string }
) {
  const { authHeader } = await import("./authApi");

  const response = await fetch(
    `http://localhost:5000/api/facilities/${facilityId}/capacity`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(status),
    }
  );

  const data = await response.json();

  if (!response.ok) throw new Error(data.message);

  return data;
}

export async function getFacilityById(
  id: number | string
) {

  const response =
    await fetch(
      `${API_URL}/facilities/${id}`
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