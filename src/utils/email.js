const EMAIL_MAX_LENGTH = 254;
const EMAIL_LOCAL_MAX_LENGTH = 64;
const EMAIL_DOMAIN_MAX_LENGTH = 253;
const EMAIL_LOCAL_ALLOWED = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const EMAIL_DOMAIN_LABEL_ALLOWED = /^[a-zA-Z0-9-]+$/;

export function isValidEmailAddress(email) {
  if (!email || email.length > EMAIL_MAX_LENGTH) return false;
  if (email.includes(" ")) return false;

  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex !== email.lastIndexOf("@") || atIndex === email.length - 1) {
    return false;
  }

  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);

  if (localPart.length > EMAIL_LOCAL_MAX_LENGTH) return false;
  if (domainPart.length > EMAIL_DOMAIN_MAX_LENGTH) return false;
  if (!EMAIL_LOCAL_ALLOWED.test(localPart)) return false;
  if (localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) return false;

  const domainLabels = domainPart.split(".");
  if (domainLabels.length < 2) return false;

  if (
    domainLabels.some(
      (label) =>
        label.length === 0 ||
        label.length > 63 ||
        label.startsWith("-") ||
        label.endsWith("-") ||
        !EMAIL_DOMAIN_LABEL_ALLOWED.test(label),
    )
  ) {
    return false;
  }

  const tld = domainLabels[domainLabels.length - 1];
  return tld.length >= 2;
}
