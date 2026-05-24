import { Router, type IRouter } from "express";
import healthRouter from "./health";
import goalsRouter from "./goals";
import plansRouter from "./plans";
import stepsRouter from "./steps";
import usageRouter from "./usage";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(goalsRouter);
router.use(plansRouter);
router.use(stepsRouter);
router.use(usageRouter);
router.use(usersRouter);

export default router;
