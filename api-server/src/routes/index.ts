import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import authRouter from "./auth";
import browserRouter from "./browser";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(authRouter);
router.use("/browser", browserRouter);

export default router;
