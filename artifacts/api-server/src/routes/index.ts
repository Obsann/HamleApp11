import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import studentsRouter from "./students";
import reportsRouter from "./reports";
import attendanceRouter from "./attendance";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(studentsRouter);
router.use(reportsRouter);
router.use(attendanceRouter);
router.use(dashboardRouter);

export default router;
