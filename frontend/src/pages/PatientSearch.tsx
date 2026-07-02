import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import {
  Search,
  ArrowLeft,
  UserPlus,
  User,
} from "lucide-react";
import {
  getPatients,
} from "../services/patientApi";

function PatientSearch() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [searchTerm, setSearchTerm] =
    useState("");

  const [patients, setPatients] =
    useState<any[]>([]);

  useEffect(() => {
    loadPatients();
  }, []);

const loadPatients = async () => {
  try {

    const data =
      await getPatients();

    setPatients(data);

  } catch (error) {

    console.error(error);

  }
};
  const filteredPatients =
    patients.filter((patient) => {
      const search =
        searchTerm.toLowerCase();

      return (
        `${patient.first_name} ${patient.last_name}`
          .toLowerCase()
          .includes(search) ||
        patient.phone.includes(
          searchTerm
        ) ||
        patient.national_id.includes(
          searchTerm
        )
      );
    });
const selectPatient = (patient: any) => {

  localStorage.setItem(
    "selectedPatient",
    JSON.stringify(patient)
  );

  navigate(`/patient-profile/${patient.id}`);
};
  return (
    <div className="patient-search-page">

      {/* HEADER */}

      <div className="patient-header">

        <button
          className="back-btn-v2"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <h1>{t("Find Patient")}</h1>
          <p>{t("Search by patient name, phone number, or national ID")}</p>
        </div>

      </div>

      {/* SEARCH */}

      <div className="search-card">

        <div className="search-input-wrapper">

          <Search size={18} />

          <input
            type="text"
            placeholder={t("Search patient...")}
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(
                e.target.value
              )
            }
          />

        </div>

      </div>

      {/* RESULTS */}

      {searchTerm &&
        filteredPatients.map(
          (patient) => (
            <div
              key={patient.id}
              className="patient-result-card"
              onClick={() =>
                selectPatient(patient)
              }
            >

              <div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems:
                      "center",
                  }}
                >
                  <User size={18} />

                  <strong>
                    {patient.first_name} {patient.last_name}
                  </strong>
                </div>

                <p>
                  {patient.gender}
                  {" • "}
                  {patient.phone}
                </p>

              </div>

            </div>
          )
        )}

      {/* NO RESULTS */}

      {searchTerm &&
        filteredPatients.length ===
          0 && (
          <div className="empty-patient-state">

            <h3>{t("No patient found")}</h3>
            <p>{t("Register a new patient record.")}</p>
            <button
              className="register-patient-btn"
              onClick={() => navigate("/register-patient?mode=referral")}
            >
              <UserPlus size={18} />
              {t("Register New Patient")}
            </button>
          </div>
        )}

      {!searchTerm && (
        <div className="empty-patient-state">
          <h3>{t("Search for a patient")}</h3>
          <p>{t("Enter a name, phone number, or national ID.")}</p>
          <button
            className="register-patient-btn"
            onClick={() => navigate("/register-patient?mode=referral")}
          >
            <UserPlus size={18} />
            {t("Register New Patient")}
          </button>
        </div>
      )}

    </div>
  );
}

export default PatientSearch;