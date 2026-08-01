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

export const createBulkMaterialSchema = z.object({
  date: z.coerce.date(),
  project: z.string().min(1, "Project is required"),
  type: enumOf(MATERIAL_TYPE),
  party: z.string().optional(),
  items: z
    .array(
      z.object({
        materialName: z.string().min(1, "Material name is required"),
        quantity: z.coerce.number().positive("Quantity must be greater than 0"),
        unit: z.string().min(1, "Unit is required"),
        note: z.string().optional(),
      }),
    )
    .min(1, "At least one material item is required"),
});

export const confirmMaterialSchema = z.object({
  status: z.enum(["Confirmed", "Issue"]),
  note: z.string().optional(),
});
