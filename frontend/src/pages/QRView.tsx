import QRCode from "react-qr-code";

export default function QRView() {

  const referral = {
    id: 1001,
    patient: "Sarah"
  };

  return (
    <div>
      <h2>Referral QR</h2>

      <QRCode
        value={JSON.stringify(referral)}
      />
    </div>
  );
}
