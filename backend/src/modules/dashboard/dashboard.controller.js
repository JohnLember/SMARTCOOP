import * as service from "./dashboard.service.js";

export async function stats(_req, res, next) {
  try {
    res.json(await service.staffStats());
  } catch (err) {
    next(err);
  }
}
