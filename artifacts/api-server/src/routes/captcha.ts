import { Router, type IRouter } from "express";
import { generateCaptcha } from "../lib/captcha";

const router: IRouter = Router();

router.get("/captcha", (_req, res) => {
  res.json(generateCaptcha());
});

export default router;
