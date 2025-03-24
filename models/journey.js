import { Schema, model } from 'mongoose';

export const telemetrySchema = new Schema({
  battery: Number,
  altitude: Number,
  speed: Number,
  temperature: Number,
  criticalBattery: Number,
  emergencyAction: String,
  pilot: String,
  sourceLongi: Number,
  sourceLatti: Number,
  destiLongi: Number,
  destiLatti: Number,
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const journeySchema = new Schema({
  journeyId: { type: String, unique: true },
  telemetry: [telemetrySchema],
  commands: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

export const Journey = model('Journey', journeySchema);
