import { useState } from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { db } from "../services/db";

function CreatePatient() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const mode =
    searchParams.get("mode");

  const [fullName, setFullName] =
    useState("");

  const [gender, setGender] =
    useState("");

  const [dateOfBirth, setDateOfBirth] =
    useState("");

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [nationalId, setNationalId] =
    useState("");

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  const handleSave = async () => {

    if (
      !fullName ||
      !gender ||
      !dateOfBirth ||
      !phoneNumber ||
      !nationalId
    ) {
      alert(
        "Please complete all required fields."
      );
      return;
    }

    if (
      phoneNumber.length !== 9
    ) {
      alert(
        "Phone number must contain 9 digits."
      );
      return;
    }

    if (
      nationalId.length !== 16
    ) {
      alert(
        "National ID must contain 16 digits."
      );
      return;
    }

    const patient = {
      id: "PAT-" + Date.now(),

      fullName,

      gender,

      dateOfBirth,

      phoneNumber:
        "+250" + phoneNumber,

      nationalId,
    };

    await db.patients.add(patient);

    localStorage.setItem(
      "selectedPatient",
      JSON.stringify(patient)
    );

    alert(
      "Patient registered successfully."
    );

    if (
      mode === "referral"
    ) {
      navigate(
        "/new-referral"
      );
    } else {
      navigate(
        "/dashboard"
      );
    }
  };

  return (
    <div className="patient-search-page">

      <div className="patient-header">

        <button
          className="back-btn-v2"
          onClick={() =>
            navigate(-1)
          }
        >
          <ArrowLeft size={20} />
        </button>

        <div>

          <h1>
            Register Patient
          </h1>

          <p>
            Create a new patient record
          </p>

        </div>

      </div>

      <div className="login-card-v2">

        <label>
          Full Name
        </label>

        <input
          value={fullName}
          onChange={(e) =>
            setFullName(
              e.target.value
            )
          }
        />

        <label>
          Gender
        </label>

        <select
          value={gender}
          onChange={(e) =>
            setGender(
              e.target.value
            )
          }
        >
          <option value="">
            Select Gender
          </option>

          <option>
            Male
          </option>

          <option>
            Female
          </option>
        </select>

        <label>
          Date of Birth
        </label>

        <input
          type="date"
          max={today}
          value={dateOfBirth}
          onChange={(e) =>
            setDateOfBirth(
              e.target.value
            )
          }
        />

        <label>
          Phone Number
        </label>

        <div
          className="phone-input-group"
        >

          <span>
            +250
          </span>

          <input
            type="tel"
            maxLength={9}
            placeholder="781234567"
            value={phoneNumber}
            onChange={(e) =>
              setPhoneNumber(
                e.target.value.replace(
                  /\D/g,
                  ""
                )
              )
            }
          />

        </div>

        <label>
          National ID
        </label>

        <input
          type="text"
          maxLength={16}
          value={nationalId}
          onChange={(e) =>
            setNationalId(
              e.target.value.replace(
                /\D/g,
                ""
              )
            )
          }
        />

        <button
          className="login-btn-v2"
          onClick={handleSave}
        >
          Register Patient
        </button>

      </div>

    </div>
  );
}

export default CreatePatient;