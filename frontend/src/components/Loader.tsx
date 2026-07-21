import { Loader2 } from "lucide-react";

interface LoaderProps {
  label?: string;
  size?: number;
  /** Centers within the full available page height, for whole-page loading states. */
  fullPage?: boolean;
  /** Renders inline with surrounding text/content instead of as a centered block. */
  inline?: boolean;
}

export default function Loader({ label, size = 28, fullPage = false, inline = false }: LoaderProps) {
  if (inline) {
    return (
      <span className="loader-inline" role="status" aria-live="polite">
        <Loader2 size={size} className="loader-spin" aria-hidden="true" />
        {label && <span>{label}</span>}
      </span>
    );
  }

  return (
    <div
      className={fullPage ? "loader-fullpage" : "loader-block"}
      role="status"
      aria-live="polite"
    >
      <Loader2 size={size} className="loader-spin" aria-hidden="true" />
      {label && <p className="loader-label">{label}</p>}
    </div>
  );
}
