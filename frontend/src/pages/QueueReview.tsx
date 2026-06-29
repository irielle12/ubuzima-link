import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../services/db";
import ConnectionStatus from "../components/ConnectionStatus";

import {
  House,
  FileText,
  Wifi,
  User,
} from "lucide-react";

function QueueReview() {
  const navigate = useNavigate();

  const [referrals, setReferrals] =
    useState<any[]>([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {

    const data =
      await db.referrals.toArray();

    setReferrals(
      data.filter(
        (r) =>
          r.workflowStatus ===
          "Pending Hospital Review"
      )
    );

  };

  const filteredReferrals =
    referrals.filter((referral) => {

      const search =
        searchTerm.toLowerCase();

      return (
        referral.id
          ?.toLowerCase()
          .includes(search)

        ||

        referral.hospital
          ?.toLowerCase()
          .includes(search)

        ||

        referral.patientName
          ?.toLowerCase()
          .includes(search)
      );

    });

  const openReferral = (
    referral: any
  ) => {

    localStorage.setItem(
      "currentReferral",
      JSON.stringify(referral)
    );

    navigate(
      "/referral-details"
    );

  };

  return (
    <div className="patient-search-page">

      {/* HEADER */}

      <div className="patient-header">

        <button
          className="back-btn-v2"
          onClick={() =>
            navigate("/referrals")
          }
        >
          ←
        </button>

        <div>

          <h1>
            Pending Review
          </h1>

          <p>
            Awaiting hospital response
          </p>

          <ConnectionStatus />

        </div>

      </div>

      {/* SEARCH */}

      <div className="details-card">

        <input
          type="text"
          placeholder="Search patient, referral ID, hospital..."
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
        />

      </div>

      {/* REFERRALS */}

      {filteredReferrals.length ===
      0 ? (

        <div className="details-card">

          <h3>
            No Referrals Found
          </h3>

          <p>
            No referrals are currently awaiting review.
          </p>

        </div>

      ) : (

        filteredReferrals.map(
          (referral) => (

            <div
              key={referral.id}
              className="referral-list-card"
              onClick={() =>
                openReferral(
                  referral
                )
              }
            >

              <h3>
                {referral.id}
              </h3>

              <p>

                Patient:{" "}

                {referral.patientName ||
                  "Unknown"}

              </p>

              <p>

                Hospital:{" "}

                {referral.hospital}

              </p>

              <span
                className="status-chip review"
              >

                Pending Review

              </span>

            </div>

          )
        )

      )}

      {/* BOTTOM NAV */}

      <nav className="bottom-nav-v2">

        <button
          className="nav-button"
          onClick={() =>
            navigate("/dashboard")
          }
        >

          <House size={20} />

          <span>
            Home
          </span>

        </button>

        <button
          className="nav-button active"
          onClick={() =>
            navigate("/referrals")
          }
        >

          <FileText size={20} />

          <span>
            Work Queue
          </span>

        </button>

        <button
          className="nav-button"
          onClick={() =>
            navigate("/sync")
          }
        >

          <Wifi size={20} />

          <span>
            Sync
          </span>

        </button>

        <button
          className="nav-button"
        >

          <User size={20} />

          <span>
            Profile
          </span>

        </button>

      </nav>

    </div>
  );
}

export default QueueReview;