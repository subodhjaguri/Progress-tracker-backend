import { Router } from "express";
import { sendSuccess } from "../utils/response.js";
import authRoutes from "./authRoutes.js";
import managerRoutes from "./managerRoutes.js";
import contractorRoutes from "./contractorRoutes.js";
import supervisorRoutes from "./supervisorRoutes.js";
import engineerRoutes from "./engineerRoutes.js";
import userRoutes from "./userRoutes.js";
import projectRoutes from "./projectRoutes.js";
import workOrderRoutes from "./workOrderRoutes.js";
import labourRoutes from "./labourRoutes.js";
import labourTaskRoutes from "./labourTaskRoutes.js";
import attendanceRoutes from "./attendanceRoutes.js";
import materialRoutes from "./materialRoutes.js";
import commentRoutes from "./commentRoutes.js";
import documentRoutes from "./documentRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import searchRoutes from "./searchRoutes.js";

const router = Router();

// Liveness/health probe. Does not depend on the database.
router.get("/health", (req, res) =>
  sendSuccess(res, { status: "ok", uptime: process.uptime() }),
);

router.use("/auth", authRoutes);
router.use("/managers", managerRoutes);
router.use("/contractors", contractorRoutes);
router.use("/supervisors", supervisorRoutes);
router.use("/engineers", engineerRoutes);
router.use("/users", userRoutes);
router.use("/projects", projectRoutes);
router.use("/work-orders", workOrderRoutes);
router.use("/labour", labourRoutes);
router.use("/labour-tasks", labourTaskRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/materials", materialRoutes);
router.use("/comments", commentRoutes);
router.use("/documents", documentRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/search", searchRoutes);

export default router;
