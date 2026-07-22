import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Database,
  Target,
  Users,
  ShieldCheck,
  Ban,
  FileCheck,
} from "lucide-react";
import BrandMark from "../components/BrandMark";

const SECTIONS = [
  {
    icon: Database,
    title: "What data we collect",
    body:
      "To coordinate a referral between facilities, we collect the patient's name, gender, date of birth, phone number, and national ID (or a guardian's national ID for minors), along with the clinical details of the referral itself  chief complaint, diagnosis, vitals, and the notes a health worker or clinician records.",
  },
  {
    icon: Target,
    title: "Why we collect it",
    body:
      "This information exists solely to coordinate patient referrals between health posts, health centers, and district hospitals — identifying the right patient, routing the referral to the right facility, and giving clinicians the clinical context they need to provide care.",
  },
  {
    icon: Users,
    title: "Who can access it",
    body:
      "Only authenticated staff — nurses, clinicians, and administrators — can access patient and referral data, and only through the facility they're assigned to. A health worker at one facility cannot see another facility's patients; a hospital only sees referrals sent to it.",
  },
  {
    icon: ShieldCheck,
    title: "How we protect it",
    body:
      "Connections are encrypted over HTTPS. Every request is authenticated with a signed JWT tied to your account and facility. Passwords are never stored in plain text — they're hashed with bcrypt. When you sign out, your session and any locally cached patient data are cleared from the device.",
  },
  {
    icon: Ban,
    title: "We don't sell or share your data",
    body:
      "We do not sell patient or staff data, and we do not share it with third parties for marketing or advertising purposes. Referral and account notifications are sent through trusted messaging providers (SMS and email) solely to deliver those specific messages on our behalf.",
  },
  {
    icon: FileCheck,
    title: "What data is used for",
    body:
      "Data collected through Ubuzima-Link is used only for referral management — creating, tracking, and closing the referral loop between facilities. It is not used for any other purpose.",
  },
];

function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="landing-v2">
      <div className="landing-glow landing-glow-a" />
      <div className="landing-glow landing-glow-b" />

      <div className="landing-shell" style={{ maxWidth: 760 }}>
        <div className="landing-brand">
          <div className="landing-mark">
            <BrandMark size={42} />
          </div>
          <div className="landing-brand-text">
            <h1>Ubuzima-Link</h1>
            <p className="landing-tagline">Healthcare Referral Management System</p>
          </div>
        </div>

        <button
          onClick={() => navigate(-1)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: "#2563eb",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            padding: 0,
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={15} /> Back
        </button>

        <div className="login-card-v2">
          <h2>Privacy Policy</h2>
          <p className="login-subtitle">
            This is a plain-language summary of how Ubuzima-Link handles data — not a
            formal legal document, but an honest account of what we collect, why, and
            how it's protected.
          </p>

          {SECTIONS.map(({ icon: Icon, title, body }) => (
            <div key={title} style={{ marginTop: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "#eff6ff",
                    color: "#2563eb",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={15} />
                </span>
                <h3 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>{title}</h3>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
                {body}
              </p>
            </div>
          ))}

          <p style={{ marginTop: 28, fontSize: 12, color: "#94a3b8" }}>
            Questions about your data? Contact your facility administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Privacy;
