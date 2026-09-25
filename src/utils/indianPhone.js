export function getINDisplayDigits(stored) {
  let d = String(stored ?? "").replace(/\D/g, "");
  if (d.startsWith("91")) d = d.slice(2);
  return d.slice(0, 10);
}

export function toINFullPhone(digits0to10) {
  const d = String(digits0to10 ?? "")
    .replace(/\D/g, "")
    .slice(0, 10);
  return d.length ? `+91${d}` : "";
}
