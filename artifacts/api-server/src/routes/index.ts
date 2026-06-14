import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tournamentsRouter from "./tournaments";
import registrationsRouter from "./registrations";
import teamsRouter from "./teams";
import matchesRouter from "./matches";
import leaderboardRouter from "./leaderboard";
import announcementsRouter from "./announcements";
import usersRouter from "./users";
import adminRouter from "./admin";
import walletRouter from "./wallet";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(tournamentsRouter);
router.use(registrationsRouter);
router.use(teamsRouter);
router.use(matchesRouter);
router.use(leaderboardRouter);
router.use(announcementsRouter);
router.use(usersRouter);
router.use(adminRouter);
router.use(walletRouter);

export default router;
