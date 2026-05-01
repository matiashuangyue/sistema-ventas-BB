const prisma = require("../../../lib/prisma");

function findByUsername(username) {
  return prisma.usuario.findFirst({
    where: {
      username: { equals: username, mode: "insensitive" },
    },
  });
}

function findByEmail(email) {
  return prisma.usuario.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
    },
  });
}

function createUsuario(data) {
  return prisma.usuario.create({ data });
}

module.exports = {
  createUsuario,
  findByEmail,
  findByUsername,
};
