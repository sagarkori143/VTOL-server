import { config } from "dotenv";
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
    const {
      sourceLongi, sourceLatti, destiLongi, destiLatti,
      altitude, temperature, criticalBattery, emergencyAction, pilot
    } = req.body;
    
    // Generate a new journey ID
    console.log("trying to generate a new journey id")
    const journeyId = generateJourneyId();
    activeJourneyId = journeyId;
    console.log("created journey id as: ", journeyId)

    // Fetch the Raspberry Pi URL
    const response = await fetch('https://vtol-server.onrender.com/api/telemetry/url');
    const raspberryResponse = await response.json();
    const raspberryUrl = raspberryResponse.url;

    if (!raspberryUrl || raspberryUrl === 'null') {
      return res.status(500).json({ error: 'Raspberry Pi URL not available' });
    }

    // Configuration data to be stored & sent to Raspberry Pi
    const configData = {
      journeyId,
      sourceLongi,
      sourceLatti,
      destiLongi,
      destiLatti,
      altitude,
      temperature,
      criticalBattery,
      emergencyAction,
      pilot,
      timestamp: new Date(),
    };
    console.log("this is the configData", configData)
    // Send configuration to Raspberry Pi
    // const raspberryConfigUrl = `${raspberryUrl}/start_journey`;
    // console.log("This is the rasp url: ",raspberryConfigUrl)
    // const configResponse = await fetch(raspberryConfigUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(configData),
    // });

    // const configResult = await configResponse.json();
    // if (!configResponse.ok) {
    //   return res.status(500).json({ error: 'Failed to configure Raspberry Pi', details: configResult });
    // }
    // console.log("Raspberry Pi configured:", configResult);

    // Save journey in database (only configurations, empty telemetry)
    const journey = new Journey({
      journeyId,
      telemetry: [],  // Empty initially
      configurations: configData,
      commands: [],
      createdAt: new Date(),
    });
    await journey.save()
      .then(() => console.log("Journey saved successfully"))
      .catch(err => console.error("Error saving journey:", err));

    res.status(200).json({ status: 'Journey started', journeyId });
  } catch (error) {
    console.error('Error starting journey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



// PUT /api/telemetry/update and this will be called by the Raspberry to update the data 
export const updateJourney = async (req, res) => {
  try {
    console.log("Trying to update!")
    if (!activeJourneyId) {
      return res.status(400).json({ error: "No active journey" });
    }

    const { horizontalSpeed, verticalSpeed, battery, currLatti, currLongi, currAltitude } = req.body;

    const journey = await Journey.findOne({ journeyId: activeJourneyId });
    if (!journey) {
      return res.status(404).json({ error: "Active journey not found" });
    }

    const telemetryData = {
      timestamp: new Date(),
      horizontalSpeed,
      verticalSpeed,
      battery,
      currLatti,
      currLongi,
      currAltitude,
    };

    realtimeTelemetry.push(telemetryData);
    journey.telemetry.push(telemetryData);
    await journey.save();

    res.status(200).json({ status: "Telemetry updated", telemetryData });
  } catch (error) {
    console.error("Error updating telemetry:", error);
    res.status(500).json({ error: "Internal server error" });
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

    console.log(`Ending Journey: ${activeJourneyId}, Total Telemetry Records: ${realtimeTelemetry.length}`);

    // Ensure telemetry is not empty before updating the database
    if (realtimeTelemetry.length > 0) {
      await Journey.findOneAndUpdate(
        { journeyId: activeJourneyId },
        {
          $push: { telemetry: { $each: realtimeTelemetry } }, // Append all telemetry data
          $set: { endedAt: new Date() }
        },
        { new: true }
      );
    } else {
      await Journey.findOneAndUpdate(
        { journeyId: activeJourneyId },
        { $set: { endedAt: new Date() } },
        { new: true }
      );
    }

    console.log("Journey ended successfully:", activeJourneyId);

    // Reset in-memory state only after successful update
    activeJourneyId = null;
    realtimeTelemetry = [];

    res.status(200).json({ status: "Journey ended successfully." });
  } catch (error) {
    console.error("Error ending journey:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
