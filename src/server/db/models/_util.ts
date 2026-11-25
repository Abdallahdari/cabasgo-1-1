import mongoose, { type Model, type Schema } from "mongoose";

/**
 * Register a model once (safe across Next.js dev hot reloads), typed with the
 * document shape inferred from its schema.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineModel<T>(name: string, schema: Schema<any>): Model<T> {
  return ((mongoose.models[name] as unknown as Model<T> | undefined) ??
    (mongoose.model(name, schema) as unknown as Model<T>));
}

export const { ObjectId } = mongoose.Schema.Types;
export type Id = mongoose.Types.ObjectId;
