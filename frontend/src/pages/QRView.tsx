import QRCode from "react-qr-code";

export default function QRView() {

  const data = localStorage.getItem("ref");
  const ref = data ? JSON.parse(data) : null;

  return (
    <div style={{ padding: 20 }}>

      <h2>Referral QR</h2>

      {ref && (
        <div style={{
          background: "white",
          padding: 20,
          borderRadius: 12
        }}>
          <QRCode value={JSON.stringify(ref)} />
          <p>{ref.name}</p>
        </div>
      )}

    </div>
  );
}