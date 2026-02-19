import { login, logout, register } from "./auth.service.js";

export function loginController(req, res) {
  const result = login({
    identifier: req.body?.identifier ?? req.body?.email,
    password: req.body?.password,
  });

  res.json(result);
}

export function registerController(req, res) {
  const result = register({
    username: req.body?.username,
    email: req.body?.email,
    password: req.body?.password,
  });

  res.status(201).json(result);
}

export function logoutController(req, res) {
  const payload = logout(req.auth?.token);
  res.json(payload);
}
