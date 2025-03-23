import { Schema, model } from 'mongoose';

const raspberrySchema = new Schema({
  url: { type: String, required: true }
});

export const Raspberry = model('Raspberry', raspberrySchema);
