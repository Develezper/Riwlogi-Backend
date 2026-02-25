import { login, logout, register } from "./auth.service.js";

export async function loginController(req, res) {
  const result = await login({
    identifier: req.body?.identifier ?? req.body?.email,
    password: req.body?.password,
  });

  res.json(result);
}

export async function registerController(req, res) {
  const result = await register({
    username: req.body?.username,
    email: req.body?.email,
    password: req.body?.password,
  });

  res.status(201).json(result);
}

export async function logoutController(req, res) {
  const result = await logout(req.auth?.token);
  res.json(result);
}
