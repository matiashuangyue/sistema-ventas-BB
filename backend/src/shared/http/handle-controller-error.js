const logger = require("../logger/logger");

function handleControllerError(
  res,
  error,
  fallbackMessage,
  fallbackStatusCode = 500,
  options = {},
) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  logger.error("Error no controlado en controller", {
    message: error.message,
    stack: error.stack,
  });

  const message =
    options.exposeOriginalMessage && error.message
      ? error.message
      : fallbackMessage;

  return res.status(fallbackStatusCode).json({ error: message });
}

module.exports = handleControllerError;
