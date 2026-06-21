import { z } from "zod";
import { enumOf } from "./helpers.js";
import { MATERIAL_TYPE } from "../constants/enums.js";

export const createMaterialSchema = z.object({
  date: z.coerce.date(),
  project: z.string().min(1, "Project is required"),
  materialName: z.string().min(1, "Material name is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unit: z.string().min(1, "Unit is required"),
  type: enumOf(MATERIAL_TYPE),
  party: z.string().optional(),
  contractor: z.string().optional(),
  note: z.string().optional(),
});
