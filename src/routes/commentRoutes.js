import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createCommentSchema } from "../validators/commentValidators.js";
import { createComment, listComments } from "../controllers/commentController.js";

const router = Router();
router.use(authenticate);

router.post("/", validate(createCommentSchema), createComment); // Manager/Contractor/SA, scoped
router.get("/", listComments);

export default router;
