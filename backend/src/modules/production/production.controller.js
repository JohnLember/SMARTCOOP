import { z } from "zod";
import * as batches from "./batches.service.js";
import * as deliveries from "./deliveries.service.js";
import * as receipts from "./receipts.service.js";
import { forbidden } from "../../utils/httpError.js";

const isStaff = (user) => user.role === "ADMIN" || user.role === "STAFF";

// --- Batches ---

const batchSchema = z.object({
  barangayId: z.number().int().positive(),
  periodType: z.enum(["KINSINA", "KATAPUSAN"]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export async function listBatches(req, res, next) {
  try {
    res.json(await batches.list(req.query));
  } catch (err) {
    next(err);
  }
}

export async function getBatch(req, res, next) {
  try {
    res.json(await batches.getById(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function createBatch(req, res, next) {
  try {
    res.status(201).json(await batches.create(batchSchema.parse(req.body), req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function deleteBatch(req, res, next) {
  try {
    res.json(await batches.remove(Number(req.params.id), req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function setBatchStatus(req, res, next) {
  try {
    const { status } = z
      .object({ status: z.enum(["OPEN", "CLOSED", "SETTLED"]) })
      .parse(req.body);
    res.json(await batches.setStatus(Number(req.params.id), status, req.user.id));
  } catch (err) {
    next(err);
  }
}

// --- Deliveries ---

const deliverySchema = z.object({
  memberId: z.number().int().positive(),
  batchId: z.number().int().positive(),
  weightKg: z.number().positive(),
  drc: z.number().min(0).max(100).optional().nullable(),
  pricePerKg: z.number().nonnegative(),
  deliveryDate: z.string().optional().nullable(),
  // Net-income deductions (loan is automatic); default 0.
  cbu: z.number().nonnegative().optional(),
  membershipFee: z.number().nonnegative().optional(),
  supplies: z.number().nonnegative().optional(),
  dayong: z.number().nonnegative().optional(),
});

export async function listDeliveries(req, res, next) {
  try {
    // Members may only list their own deliveries.
    if (req.user.role === "MEMBER") {
      return res.json(await deliveries.list({ memberId: req.user.memberId }));
    }
    res.json(await deliveries.list(req.query));
  } catch (err) {
    next(err);
  }
}

export async function getDelivery(req, res, next) {
  try {
    const delivery = await deliveries.getById(Number(req.params.id));
    if (req.user.role === "MEMBER" && delivery.memberId !== req.user.memberId) {
      throw forbidden("You can only view your own deliveries");
    }
    res.json(delivery);
  } catch (err) {
    next(err);
  }
}

export async function createDelivery(req, res, next) {
  try {
    if (!isStaff(req.user)) throw forbidden("Only staff can record deliveries");
    res.status(201).json(await deliveries.create(deliverySchema.parse(req.body), req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function deductionDefaults(_req, res, next) {
  try {
    res.json(await deliveries.getDeductionDefaults());
  } catch (err) {
    next(err);
  }
}

export async function explainDelivery(req, res, next) {
  try {
    const delivery = await deliveries.getById(Number(req.params.id));
    if (req.user.role === "MEMBER" && delivery.memberId !== req.user.memberId) {
      throw forbidden("You can only view your own delivery computation");
    }
    res.json(await deliveries.explainDelivery(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
}

// --- Receipts ---

export async function listReceipts(req, res, next) {
  try {
    if (req.user.role === "MEMBER") {
      return res.json(await receipts.list({ memberId: req.user.memberId }));
    }
    res.json(await receipts.list(req.query));
  } catch (err) {
    next(err);
  }
}

export async function getReceipt(req, res, next) {
  try {
    const receipt = await receipts.getById(Number(req.params.id));
    if (req.user.role === "MEMBER" && receipt.memberId !== req.user.memberId) {
      throw forbidden("You can only view your own receipts");
    }
    res.json(receipt);
  } catch (err) {
    next(err);
  }
}
