import { Link } from "react-router-dom";

export default function Dashboard() {

  const referrals = [
    { name: "John Doe", status: "PENDING" },
    { name: "Mary U.", status: "SYNCED" }
  ];

  return (
    <div style={styles.container}>

      <div style={styles.header}>
        <h2>Dashboard</h2>
        <span style={styles.online}>🟢 Online</span>
      </div>

      <Link to="/new-referral" style={styles.button}>
        + New Referral
      </Link>

      <input
        placeholder="Search referrals..."
        style={styles.search}
      />

      <div>
        {referrals.map((r, i) => (
          <div key={i} style={styles.card}>
            <b>{r.name}</b>
            <p>Status: {r.status}</p>
          </div>
        ))}
      </div>

    </div>
  );
}

const styles: any = {
  container: {
    padding: 20
  },
  header: {
    display: "flex",
    justifyContent: "space-between"
  },
  online: {
    fontSize: 12
  },
  button: {
    display: "block",
    background: "#2DA8FF",
    color: "white",
    padding: 12,
    borderRadius: 12,
    textDecoration: "none",
    textAlign: "center",
    marginTop: 10
  },
  search: {
    width: "100%",
    padding: 10,
    marginTop: 10,
    borderRadius: 10,
    border: "1px solid #ddd"
  },
  card: {
    background: "white",
    padding: 12,
    borderRadius: 12,
    marginTop: 10
  }
};