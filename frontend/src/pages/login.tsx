import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [workerId, setWorkerId] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin() {
    navigate("/dashboard");
  }

  return (
    <div style={styles.container}>
      
      <div style={styles.card}>
        <h2 style={{ color: "#2DA8FF" }}>
          Ubuzima-Link
        </h2>

        <p>Health Worker Login</p>

        <input
          placeholder="Worker ID"
          style={styles.input}
          onChange={(e) => setWorkerId(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          style={styles.input}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div style={styles.offline}>
          🟠 Offline Mode Available
        </div>

        <button style={styles.button} onClick={handleLogin}>
          Login
        </button>
      </div>

    </div>
  );
}

const styles: any = {
  container: {
    display: "flex",
    height: "100vh",
    justifyContent: "center",
    alignItems: "center"
  },
  card: {
    width: 320,
    background: "white",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  },
  input: {
    width: "100%",
    padding: 10,
    marginTop: 10,
    borderRadius: 10,
    border: "1px solid #ddd"
  },
  button: {
    width: "100%",
    marginTop: 15,
    padding: 12,
    background: "#2DA8FF",
    color: "white",
    border: "none",
    borderRadius: 10,
    cursor: "pointer"
  },
  offline: {
    fontSize: 12,
    marginTop: 10,
    color: "#f59e0b"
  }
};