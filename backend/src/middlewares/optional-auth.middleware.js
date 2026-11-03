const jwt = require("jsonwebtoken");
const env = require("../config/env");

// En la cuenta de uso individual la sesion solo identifica al autor del ajuste.
// Un token ausente, vencido o invalido no impide registrar el movimiento.
function optionalAuthMiddleware(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  req.user = undefined;

  if (scheme === "Bearer" && token) {
    try {
      req.user = jwt.verify(token, env.jwtSecret);
    } catch {
      // Sin una sesion verificable el ajuste se guarda sin autor asociado.
    }
  }

  next();
}

module.exports = optionalAuthMiddleware;
