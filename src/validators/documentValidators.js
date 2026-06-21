import { z } from "zod";
import { enumOf } from "./helpers.js";
import { DOC_PARENT_TYPES, DOC_CATEGORY } from "../constants/enums.js";

// Validates the multipart text fields (runs after multer populates req.body).
export const uploadDocumentSchema = z.object({
  parentType: enumOf(DOC_PARENT_TYPES),
  parentId: z.string().min(1, "parentId is required"),
  category: enumOf(DOC_CATEGORY),
  progressUpdateId: z.string().optional(),
  isSensitive: z.string().optional(), // "true"/"false" string; parsed in controller
});
