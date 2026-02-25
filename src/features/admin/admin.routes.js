import { Router } from "express";
import { requireRole } from "../../middleware/auth.js";
import {
    deleteAdminProblemController,
    deleteAdminUserController,
    generateAdminProblemController,
    getAdminOverviewController,
    listAdminProblemsController,
    listAdminUsersController,
    updateAdminProblemController,
} from "./admin.controller.js";

const router = Router();
router.use(requireRole("admin"));

router.get("/overview", getAdminOverviewController);
router.get("/users", listAdminUsersController);
router.delete("/users/:id", deleteAdminUserController);
router.get("/problems", listAdminProblemsController);
router.post("/problems/generate", generateAdminProblemController);
router.patch("/problems/:id", updateAdminProblemController);
router.delete("/problems/:id", deleteAdminProblemController);

export { router as adminRoutes };
