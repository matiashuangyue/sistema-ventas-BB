require("dotenv").config();

const env = {
  port: Number(process.env.PORT) || 8080,
  databaseUrl: process.env.DATABASE_URL,
  invitationCode: process.env.INVITATION_CODE || "BB2026_PRO",
  jwtSecret: process.env.JWT_SECRET || "secreto_super_seguro",
};

module.exports = env;
