import { Schema, model } from 'mongoose';

export const telemetrySchema = new Schema({
  battery: Number,
  latitude: Number,
  longitude: Number,
  altitude: Number,
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const journeySchema = new Schema({
  journeyId: { type: String, unique: true },
  telemetry: [telemetrySchema],
  createdAt: { type: Date, default: Date.now }
});

export const Journey = model('Journey', journeySchema);
