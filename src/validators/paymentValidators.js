import { z } from "zod";

export const createPaymentSchema = z.object({
  project: z.string().min(1, "Project is required"),
  type: z.enum(["Labour", "Contractor", "Miscellaneous"]),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.coerce.date().optional(),
  contractor: z.string().optional(),
  labourCount: z.coerce.number().optional(),
  proofNotes: z.string().optional(),
  attachment: z.string().optional(),
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum(["Approved", "Paid", "Rejected"]),
  note: z.string().optional(),
  // Proof of payment is attached by the manager settling it, not by the
  // supervisor who requested it.
  attachment: z.string().optional(),
});
