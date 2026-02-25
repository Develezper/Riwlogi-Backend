import { z } from "zod";
import { isValidEmailAddress } from "../../utils/email.js";
import { parseOrBadRequest } from "../../utils/zod.js";

const USERNAME_ALLOWED = /^[a-zA-Z0-9_]+$/;

const loginInputSchema = z
  .any()
  .transform((value) => {
    const input = value && typeof value === "object" ? value : {};
    return {
      identifier: String(input.identifier ?? input.email ?? "").trim(),
      password: String(input.password ?? "").trim(),
    };
  })
  .superRefine((value, ctx) => {
    if (!value.identifier || !value.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes enviar identificador y contraseña.",
      });
    }
  });

const registerInputSchema = z
  .any()
  .transform((value) => {
    const input = value && typeof value === "object" ? value : {};
    return {
      username: String(input.username ?? "").trim(),
      email: String(input.email ?? "").trim().toLowerCase(),
      password: String(input.password ?? "").trim(),
    };
  })
  .superRefine((value, ctx) => {
    if (!value.username || !value.email || !value.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Todos los campos son obligatorios.",
      });
      return;
    }

    if (value.username.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["username"],
        message: "El username debe tener al menos 3 caracteres.",
      });
      return;
    }

    if (value.username.length > 30) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["username"],
        message: "El username no puede superar 30 caracteres.",
      });
      return;
    }

    if (!USERNAME_ALLOWED.test(value.username)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["username"],
        message: "El username solo permite letras, números y guion bajo.",
      });
      return;
    }

    if (!isValidEmailAddress(value.email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Debes enviar un email válido.",
      });
      return;
    }

    if (value.password.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "La contraseña debe tener al menos 6 caracteres.",
      });
    }
  });

export function parseLoginInput(input) {
  return parseOrBadRequest(loginInputSchema, input, "Debes enviar identificador y contraseña.");
}

export function parseRegisterInput(input) {
  return parseOrBadRequest(registerInputSchema, input, "Todos los campos son obligatorios.");
}
