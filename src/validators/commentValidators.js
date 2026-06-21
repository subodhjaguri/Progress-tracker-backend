import { z } from "zod";
import { enumOf } from "./helpers.js";
import { COMMENT_PARENT_TYPES } from "../constants/enums.js";

export const createCommentSchema = z.object({
  parentType: enumOf(COMMENT_PARENT_TYPES),
  parentId: z.string().min(1, "Parent id is required"),
  text: z.string().min(1, "Comment text is required"),
});
