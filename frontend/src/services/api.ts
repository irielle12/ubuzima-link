const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

if (import.meta.env.PROD && API_URL.startsWith("http://")) {
  console.error(
    "VITE_API_URL is not using HTTPS in a production build — credentials and patient data would be sent in plaintext. Fix the API_URL environment variable."
  );
}

export default API_URL;