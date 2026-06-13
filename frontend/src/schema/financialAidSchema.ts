import { z } from "zod";

// ============================================================================
// Financial Aid Schemas  (dashboard-only — not part of the registration wizard)
// ============================================================================

export const FINANCIAL_AID_STATUS = [
  "pending",
  "under_review",
  "approved",
  "rejected",
  "on_hold",
] as const;
export type FinancialAidStatus = (typeof FINANCIAL_AID_STATUS)[number];

/**
 * One financial aid application entry.
 * Stored as an array `financial_aid_applications[]` on the client document.
 */
export const paymentInstallmentSchema = z.object({
  amount: z.coerce.number().nonnegative().optional().or(z.literal(0)),
  due_date: z.string().optional().or(z.literal("")),
  status: z.string().trim().max(50).optional().or(z.literal("")),
});
export type PaymentInstallment = z.infer<typeof paymentInstallmentSchema>;

export const financialAidApplicationSchema = z.object({
  status: z.enum(FINANCIAL_AID_STATUS, {
    errorMap: () => ({ message: "Please select a status" }),
  }),

  requested_amount: z.coerce
    .number({
      invalid_type_error: "Enter a valid number",
    })
    .nonnegative("Amount cannot be negative")
    .max(1_000_000, "Amount seems too large")
    .optional()
    .or(z.literal(0)),

  awarded_amount: z.coerce
    .number({
      invalid_type_error: "Enter a valid number",
    })
    .nonnegative("Amount cannot be negative")
    .max(1_000_000, "Amount seems too large")
    .optional()
    .or(z.literal(0)),

  application_date: z.string().optional().or(z.literal("")),

  review_notes: z
    .string()
    .trim()
    .max(2000, "Notes are too long")
    .optional()
    .or(z.literal("")),

  financial_aid_parent_names: z.string().trim().max(200).optional().or(z.literal("")),
  financial_aid_circumstances: z.string().trim().max(2000).optional().or(z.literal("")),
  payment_installments: z.array(paymentInstallmentSchema).default([]),
});

export type FinancialAidApplication = z.infer<
  typeof financialAidApplicationSchema
>;

/**
 * Tab-level wrapper so useFieldArray has a named key to target.
 */
export const financialAidTabSchema = z.object({
  financial_aid_applications: z
    .array(financialAidApplicationSchema)
    .default([]),
});

export type FinancialAidTabFormData = z.infer<typeof financialAidTabSchema>;