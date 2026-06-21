import mongoose from "mongoose";

/**
 * Shared schema behavior for every collection:
 *  - `createdBy`, `isDeleted`, `deletedAt` fields + `createdAt`/`updatedAt` timestamps
 *  - soft-delete: find queries exclude deleted docs unless `.setOptions({ withDeleted: true })`
 *  - toJSON: expose `id`, drop `_id`/`__v`/soft-delete fields; optional `scrub(ret)` hook
 */
export function baseSchema(schema, { scrub } = {}) {
  schema.add({
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  });

  schema.set("timestamps", true);

  schema.pre(/^find/, function () {
    if (!this.getOptions().withDeleted) {
      this.where({ isDeleted: { $ne: true } });
    }
  });

  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = ret._id?.toString?.() ?? ret._id;
      delete ret._id;
      delete ret.isDeleted;
      delete ret.deletedAt;
      if (typeof scrub === "function") scrub(ret);
      return ret;
    },
  });
}
