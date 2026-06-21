/** Success envelope: { data, meta? }. */
export function sendSuccess(res, data, meta, status = 200) {
  const body = { data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

/** 201 Created convenience. */
export function sendCreated(res, data) {
  return sendSuccess(res, data, undefined, 201);
}
