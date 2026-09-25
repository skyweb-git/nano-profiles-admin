import { getINDisplayDigits, toINFullPhone } from "../utils/indianPhone";
import "./PhoneINInput.css";

export default function PhoneINInput({
  value,
  onChange,
  inputClassName = "",
  wrapClassName = "",
  disabled,
  autoFocus,
  id,
  name,
  "aria-label": ariaLabel,
  placeholder = "10-digit mobile",
  style
}) {
  const digits = getINDisplayDigits(value);

  function commitDigits(raw) {
    const next = String(raw ?? "")
      .replace(/\D/g, "")
      .slice(0, 10);
    const full = toINFullPhone(next);
    if (typeof onChange === "function") {
      onChange(full);
    }
  }

  return (
    <div className={`phone-in-input-wrap ${wrapClassName}`.trim()} style={style}>
      <span className="phone-in-prefix" aria-hidden="true">
        +91
      </span>
      <input
        id={id}
        name={name || "phone"}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="done"
        autoComplete="tel"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={10}
        className={`phone-in-field ${inputClassName}`.trim()}
        placeholder={placeholder}
        value={digits}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={ariaLabel || "Mobile number (10 digits after +91)"}
        onChange={(e) => commitDigits(e.currentTarget.value)}
      />
    </div>
  );
}
