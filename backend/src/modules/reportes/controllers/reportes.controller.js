const express = require("express");

const handleControllerError = require("../../../shared/http/handle-controller-error");
const DashboardFiltrosDto = require("../models/dtos/dashboard-filtros.dto");
const reportesService = require("../services/reportes.service");

const router = express.Router();

router.get("/dashboard", async (req, res) => {
  try {
    const dto = DashboardFiltrosDto.from(req.query);
    const dashboard = await reportesService.obtenerDashboard(dto);
    res.json(dashboard);
  } catch (error) {
    handleControllerError(res, error, "Error en reportes");
  }
});

module.exports = router;
