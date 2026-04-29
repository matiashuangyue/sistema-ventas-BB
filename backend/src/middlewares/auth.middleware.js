const jwt = require("jsonwebtoken");
const env = require("../config/env");

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Token invalido" });
    }

    const decoded = jwt.verify(token, env.jwtSecret);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "No autorizado" });
  }
}

module.exports = authMiddleware;
