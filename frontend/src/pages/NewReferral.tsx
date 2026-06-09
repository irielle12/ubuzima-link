import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function NewReferral() {

  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [reason, setReason] = useState("");

  function submit() {
    localStorage.setItem("ref", JSON.stringify({
      name,
      age,
      reason
    }));

    navigate("/qr");
  }

  return (
    <div style={styles.container}>

      <h2>New Referral</h2>

      <input
        placeholder="Patient Name"
        style={styles.input}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        placeholder="Age"
        style={styles.input}
        onChange={(e) => setAge(e.target.value)}
      />

      <textarea
        placeholder="Reason"
        style={styles.textarea}
        onChange={(e) => setReason(e.target.value)}
      />

      <button style={styles.button} onClick={submit}>
        Create Referral
      </button>

    </div>
  );
}

const styles: any = {
  container: {
    padding: 20
  },
  input: {
    width: "100%",
    padding: 10,
    marginTop: 10,
    borderRadius: 10,
    border: "1px solid #ddd"
  },
  textarea: {
    width: "100%",
    padding: 10,
    marginTop: 10,
    borderRadius: 10,
    border: "1px solid #ddd",
    height: 80
  },
  button: {
    width: "100%",
    marginTop: 15,
    padding: 12,
    background: "#2DA8FF",
    color: "white",
    border: "none",
    borderRadius: 10
  }
};