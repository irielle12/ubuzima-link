import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ArrowLeft,
  UserPlus,
  User,
} from "lucide-react";
import { db } from "../services/db";

function PatientSearch() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] =
    useState("");

  const [patients, setPatients] =
    useState<any[]>([]);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    const allPatients =
      await db.patients.toArray();

    setPatients(allPatients);
  };

  const filteredPatients =
    patients.filter((patient) => {
      const search =
        searchTerm.toLowerCase();

      return (
        patient.fullName
          .toLowerCase()
          .includes(search) ||
        patient.phoneNumber.includes(
          searchTerm
        ) ||
        patient.nationalId.includes(
          searchTerm
        )
      );
    });

  const selectPatient = (
    patient: any
  ) => {
    localStorage.setItem(
      "selectedPatient",
      JSON.stringify(patient)
    );

    navigate("/new-referral");
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
          <h1>Find Patient</h1>

          <p>
            Search by patient name,
            phone number, or national ID
          </p>
        </div>

      </div>

      {/* SEARCH */}

      <div className="search-card">

        <div className="search-input-wrapper">

          <Search size={18} />

          <input
            type="text"
            placeholder="Search patient..."
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
                    {patient.fullName}
                  </strong>
                </div>

                <p>
                  {patient.gender}
                  {" • "}
                  {patient.phoneNumber}
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

            <h3>
              No patient found
            </h3>

            <p>
              Register a new
              patient record.
            </p>

            <button
              className="register-patient-btn"
              onClick={() =>
                navigate(
                  "/create-patient"
                )
              }
            >
              <UserPlus size={18} />

              Register New Patient
            </button>

          </div>
        )}

      {/* INITIAL STATE */}

      {!searchTerm && (
        <div className="empty-patient-state">

          <h3>
            Search for a patient
          </h3>

          <p>
            Enter a name, phone
            number, or national ID.
          </p>

          <button
            className="register-patient-btn"
            onClick={() =>
              navigate(
                "/register-patient?mode=referral"
              )
            }
          >
            <UserPlus size={18} />

            Register New Patient
          </button>

        </div>
      )}

    </div>
  );
}

export default PatientSearch;