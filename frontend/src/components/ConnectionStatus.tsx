import { useEffect, useState } from "react";
import { Wifi } from "lucide-react";

function ConnectionStatus() {
  const [isOnline, setIsOnline] =
    useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () =>
      setIsOnline(true);

    const goOffline = () =>
      setIsOnline(false);

    window.addEventListener(
      "online",
      goOnline
    );

    window.addEventListener(
      "offline",
      goOffline
    );

    return () => {
      window.removeEventListener(
        "online",
        goOnline
      );

      window.removeEventListener(
        "offline",
        goOffline
      );
    };
  }, []);

  return (
    <div
      className={
        isOnline
          ? "connection-status"
          : "connection-status offline"
      }
    >
      <Wifi size={16} />

      <span>
        {isOnline
          ? "Online"
          : "Offline"}
      </span>
    </div>
  );
}

export default ConnectionStatus;