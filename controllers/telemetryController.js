import { Journey } from "../models/journey.js";
import { calculateDistance } from "../utils/calculateDistance.js"
import { getBatterySoC } from "../utils/raspberryServices.js";
import { checkCapability } from "../utils/raspberryServices.js";

// In-memory active journey id and realtime telemetry array
let activeJourneyId = null;
let realtimeTelemetry = [];

// Function to generate a simple journey id (could be replaced with a UUID)
function generateJourneyId() {
  return 'journey-' + Date.now();
}

export const checkFeasibility = async (req, res) => {
  try {
    const { sourceLongi, sourceLatti, destiLongi, destiLatti } = req.body;
    const distance = calculateDistance(sourceLongi, sourceLatti, destiLongi, destiLatti);
    const batteryData = await getBatterySoC();
    const batterySoC = batteryData?.batterySoC ?? null;
    if (!batterySoC || typeof batterySoC !== "number") {
      return res.status(500).json({ error: "Invalid battery data", batterySoC });
    }
    if (isNaN(distance) || distance < 0) {
      return res.status(500).json({ error: "Invalid distance data", distance });
    }
    const isJourneyPossible = checkCapability(distance, batterySoC);
    console.log(distance, batterySoC, isJourneyPossible);

    if (!isJourneyPossible) {
      return res.status(400).json({
        error: "Battery is insufficient to cover the journey.",
        batterySoC: batterySoC,
        distance: distance
      });
    }
    return res.status(200).json({
      message: "This journey can be commenced. Go ahead!"
    })
  } catch {
    return res.status(505).json({
      error: "Some error occured."
    })
  }
}


// POST /api/telemetry/start
export const startJourney = async (req, res) => {
  try {
    // Extract telemetry data from request body
    const telemetry = req.body;
    telemetry.timestamp = new Date();
   
    // Fetch the Raspberry Pi URL from the router
    const response = await fetch('https://vtol-server.onrender.com/api/telemetry/url');
    const raspberryResponse = await response.json();
    const raspberryUrl = raspberryResponse.url;


    if (!raspberryUrl || raspberryUrl === 'null') {
      return res.status(500).json({ error: 'Raspberry Pi URL not available' });
    }

    // Send telemetry data to the Raspberry Pi
    const raspberryPostUrl = `${raspberryUrl}/start_journey`;
    try {
      const response = await fetch(raspberryPostUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telemetry)
      });
    
      const result = await response.json();
      console.log("Raspberry Response:", result);
    } catch (error) {
      console.error("Error sending data:", error);
    }

    // Create a new journey document with the first telemetry record
    const journey = new Journey({
      journeyId: generateJourneyId(),
      telemetry: [telemetry]
    });
    const savedJourney = await journey.save(); // here we are saving the current status
    activeJourneyId = savedJourney.journeyId;
    realtimeTelemetry = [telemetry];
    console.log('New journey started with ID:', activeJourneyId);
    res.status(200).json({ status: 'journey started', journeyId: activeJourneyId });
  } catch (error) {
    console.error('Error starting journey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/telemetry/update and this will be called by the Raspberry to update the data 
export const updateJourney = async (req, res) => {
  try {
    if (!activeJourneyId) {
      return res.status(400).json({ error: 'No active journey. Start a journey first.' });
    }
    const telemetry = req.body;
    telemetry.timestamp = new Date();
    console.log("Received Telemetry Data:", telemetry); 

    // Append telemetry to the in-memory array
    realtimeTelemetry.push(telemetry);

    // Update the journey document in MongoDB by pushing the new telemetry record
    await Journey.findOneAndUpdate(
      { journeyId: activeJourneyId },
      { $push: { telemetry: telemetry } },
      { new: true }
    );
    console.log('Journey updated for ID:', activeJourneyId);
    res.status(200).json({ status: 'journey updated' });
  } catch (error) {
    console.error('Error updating journey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/telemetry
export const getLatestTelemetry = async (req, res) => {
  try {
    if (realtimeTelemetry.length === 0) {
      return res.status(404).json({ error: 'No telemetry data available' });
    }
    const latestTelemetry = realtimeTelemetry[realtimeTelemetry.length - 1];
    res.status(200).json(latestTelemetry);
  } catch (error) {
    console.error('Error getting latest telemetry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// DELETE /api/telemetry/end
export const endJourney = async (req, res) => {
  try {
    if (!activeJourneyId) {
      return res.status(400).json({ error: "No active journey to end." });
    }

    // Update the journey document in MongoDB with the final telemetry data
    await Journey.findOneAndUpdate(
      { journeyId: activeJourneyId },
      { $set: { telemetry: realtimeTelemetry, endedAt: new Date() } },
      { new: true }
    );

    console.log("Journey ended with ID:", activeJourneyId);

    // Reset in-memory journey state
    activeJourneyId = null;
    realtimeTelemetry = [];

    res.status(200).json({ status: "Journey ended successfully." });
  } catch (error) {
    console.error("Error ending journey:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

