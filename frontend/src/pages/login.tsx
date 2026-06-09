import { useState } from "react";

export default function Login() {
  const [workerId, setWorkerId] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    const response = await fetch(
      "http://localhost:5000/api/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          workerId,
          password
        })
      }
    );

    const data = await response.json();

    alert(data.message);
  }

  return (
    <div>
      <h1>Ubuzima-Link</h1>

      <input
        placeholder="Worker ID"
        onChange={(e) =>
          setWorkerId(e.target.value)
        }
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) =>
          setPassword(e.target.value)
        }
      />

      <button onClick={handleLogin}>
        Login
      </button>
    </div>
  );
}