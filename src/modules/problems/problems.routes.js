import { Router } from "express";
import { getProblemController, listProblemsController, listTagsController } from "./problems.controller.js";

const router = Router();

router.get("/", listProblemsController);
router.get("/tags", listTagsController);
router.get("/:slug", getProblemController);

export { router as problemsRoutes };
