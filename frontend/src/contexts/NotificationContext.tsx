import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  id: number;
  message: string;
  resolve: (value: boolean) => void;
}

interface NotificationContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

let nextId = 1;

const TOAST_ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, type, message }]);
      window.setTimeout(() => dismiss(id), type === "error" ? 6000 : 3500);
    },
    [dismiss]
  );

  const success = useCallback((message: string) => push("success", message), [push]);
  const error = useCallback((message: string) => push("error", message), [push]);
  const info = useCallback((message: string) => push("info", message), [push]);

  const confirm = useCallback((message: string, options?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPendingConfirm({ id: nextId++, message, resolve, ...options });
    });
  }, []);

  const settleConfirm = (value: boolean) => {
    pendingConfirm?.resolve(value);
    setPendingConfirm(null);
  };

  return (
    <NotificationContext.Provider value={{ success, error, info, confirm }}>
      {children}

      {/* TOASTS */}
      <div className="toast-stack">
        {toasts.map((t) => {
          const Icon = TOAST_ICONS[t.type];
          return (
            <div key={t.id} className={`toast-item toast-${t.type}`}>
              <Icon size={18} />
              <span>{t.message}</span>
              <button
                className="toast-dismiss"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* CONFIRM DIALOG */}
      {pendingConfirm && (
        <div className="warning-modal">
          <div className="warning-card">
            {pendingConfirm.title && <h3>{pendingConfirm.title}</h3>}
            <p style={{ margin: pendingConfirm.title ? "8px 0 0" : 0, color: "#334155", fontSize: 14, lineHeight: 1.5 }}>
              {pendingConfirm.message}
            </p>
            <div className="warning-actions">
              <button
                className={pendingConfirm.danger ? "danger-action-btn" : "primary-action-btn"}
                onClick={() => settleConfirm(true)}
              >
                {pendingConfirm.confirmLabel || "Confirm"}
              </button>
              <button className="secondary-action-btn" onClick={() => settleConfirm(false)}>
                {pendingConfirm.cancelLabel || "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return ctx;
}
