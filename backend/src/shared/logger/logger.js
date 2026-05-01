function log(level, message, meta) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  const writer =
    level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log;

  if (meta) {
    writer(prefix, message, meta);
    return;
  }

  writer(prefix, message);
}

const logger = {
  info(message, meta) {
    log("INFO", message, meta);
  },

  warn(message, meta) {
    log("WARN", message, meta);
  },

  error(message, meta) {
    log("ERROR", message, meta);
  },
};

module.exports = logger;
