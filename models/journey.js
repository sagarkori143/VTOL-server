import mongoose from "mongoose";

const { Schema } = mongoose;

const telemetrySchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  horizontalSpeed: Number,
  verticalSpeed: Number,
  battery: Number,
  currLatti: Number,
  currLongi: Number,
  currAltitude: Number
});

const configurationSchema = new Schema({
  altitude: Number,
  temperature: Number,
  criticalBattery: Number,
  emergencyAction: String,
  pilot: String,
  sourceLongi: Number,
  sourceLatti: Number,
  destiLongi: Number,
  destiLatti: Number,
  path: [
    {
      lat: Number,
      lon: Number
    }
  ],
  timestamp: { type: Date, default: Date.now }
});

const journeySchema = new Schema({
  journeyId: { type: String, unique: true },
  telemetry: [telemetrySchema],
  commands: { type: [String], default: [] },
  configurations: configurationSchema,
  createdAt: { type: Date, default: Date.now }
});

const Journey = mongoose.model("Journey", journeySchema);

export { Journey };  // Named export
