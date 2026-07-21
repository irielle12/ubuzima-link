import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ style, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="password-field">
        <input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          style={{ ...style, paddingRight: 40 }}
        />
        <button
          type="button"
          className="password-toggle-btn"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  }
);

export default PasswordInput;
