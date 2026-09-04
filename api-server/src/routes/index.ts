import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import authRouter from "./auth";
import browserRouter from "./browser";
import imageRouter from "./image";
import historyRouter from "./history";
import githubOAuthRouter from "./githubOAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(authRouter);
router.use("/browser", browserRouter);
router.use(imageRouter);
router.use(historyRouter);
router.use(githubOAuthRouter);

export default router;
