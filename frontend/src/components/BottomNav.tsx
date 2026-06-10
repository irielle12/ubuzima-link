import { useNavigate } from "react-router-dom";

interface Props {
  active: "home" | "referrals" | "sync" | "profile";
}

function BottomNav({ active }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bottom-nav">

      <div
        className={active === "home" ? "nav-item active-nav" : "nav-item"}
        onClick={() => navigate("/dashboard")}
      >
        🏠
        <span>Home</span>
      </div>

      <div
        className={active === "referrals" ? "nav-item active-nav" : "nav-item"}
      >
        📄
        <span>Referrals</span>
      </div>

      <div
        className={active === "sync" ? "nav-item active-nav" : "nav-item"}
      >
        🔄
        <span>Sync</span>
      </div>

      <div
        className={active === "profile" ? "nav-item active-nav" : "nav-item"}
      >
        👤
        <span>Profile</span>
      </div>

    </div>
  );
}

export default BottomNav;