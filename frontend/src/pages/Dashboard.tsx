import { useEffect, useState } from "react";

export default function Dashboard() {

  const [referrals, setReferrals] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/referrals")
      .then((res) => res.json())
      .then((data) => setReferrals(data));
  }, []);

  return (
    <div>
      <h2>Recent Referrals</h2>

      {referrals.map((ref:any) => (
        <div key={ref.id}>
          {ref.patientName}
        </div>
      ))}
    </div>
  );
}