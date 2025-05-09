import { Journey } from "../models/journey.js";
import { calculateDistance } from "../utils/feasibility.js";

// In-memory active journey id and realtime telemetry array
let activeJourneyId = null;
let realtimeTelemetry = [];
let realtimeConfigurations = {};
let commands = [];
let initialDroneData = {
  batterySOC: 0,
  droneLatti: 0.0,
  droneLongi: 0.0
};
let path=[]
const liveTempreature=-1;

// Function to generate a simple journey id (could be replaced with a UUID)
function generateJourneyId() {
  return 'journey-' + Date.now();
}

export const checkFeasibility = async (req, res) => {
  try {
    const { sourceLongi, sourceLatti, destiLongi, destiLatti } = req.body;

    // Calculate the distance
    const distance = calculateDistance(sourceLongi, sourceLatti, destiLongi, destiLatti);

    const batterySoC = 85; //initialDroneData.batterySOC;
    // const batterySoC = batteryData?.batterySoC ?? null; 

    if (!batterySoC || typeof batterySoC !== "number") {
      return res.status(500).json({ error: "Invalid battery data", batterySoC });
    }

    // Check if the distance is valid
    if (isNaN(distance) || distance < 0) {
      return res.status(500).json({ error: "Invalid distance data", distance });
    }

    // Check if the journey is possible with the given battery and distance
    const batteryPerKm = 40 / 30;
    const requiredBattery = distance * batteryPerKm;
    const isJourneyPossible = batterySoC >= requiredBattery;
    if (!isJourneyPossible) {
      console.log("Battery insufficient to cover the journey");  // Log if battery is insufficient
      return res.status(400).json({
        error: "Battery is insufficient to cover the journey.",
        batterySoC: batterySoC,
        distance: distance
      });
    }
    return res.status(200).json({
      message: "This journey can be commenced. Go ahead!",
      batterySoC: batterySoC,
      distance: distance,
      waypoints:[]
    });
  } catch (err) {
    console.error("Error occurred:", err);  // Log the error if any occurs during the process
    return res.status(505).json({
      error: "Some error occurred."
    });
  }
};



export const droneDetails = async (req, res) => {
  try {
    const { droneLatti, droneLongi, battery } = req.body;

    initialDroneData.droneLatti = droneLatti;
    initialDroneData.droneLongi = droneLongi;
    initialDroneData.batterySOC = battery;

    return res.status(200).json({
      message: "Drone details uploaded successfully!"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Some error occurred."
    });
  }
};

export const getDroneLocation = async (req, res) => {
  try {
    return res.status(200).json({
      message: "Drone details uploaded successfully!",
      initialDroneData,
      
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Some error occurred."
    });
  }
};

export const command = async (req, res) => {
  try {
    const { command } = req.body;
    commands.push(command);

    return res.status(200).json({
      message: "Command sent successfully!"
    });
  } catch {
    console.error(err);
    return res.status(500).json({
      error: "Some error occurred."
    });
  }
}

export const getCommand = async (req, res) => {
  try {
    if(!command || command.length==0){
      return res.status(500).json({
        error: "No command found!"
      });
    }
    const command=commands[-1];

    return res.status(200).json({
      message: "Command sent successfully!",
      command
    });
  } catch {
    console.error(err);
    return res.status(500).json({
      error: "Some error occurred."
    });
  }
}

export const updateTempreature= async(res,req)=>{
  try{
    const {tempreature,humidity}=req.body;
    liveTempreature=tempreature;
    return res.status(200).json({
      message: "Tempreature sent successfully!",
      command
    });
  }catch{
    console.error(err);
    return res.status(500).json({
      error: "Some error occurred."
    });
  }
}


// POST /api/telemetry/start
export const startJourney = async (req, res) => {
  try {
    const {
      sourceLongi, sourceLatti, destiLongi, destiLatti,
      altitude, temperature, criticalBattery, emergencyAction, pilot
    } = req.body;

    const journeyId = generateJourneyId();
    activeJourneyId = journeyId;

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
      path,
      timestamp: new Date(),
    };

    // Save journey in database (only configurations, empty telemetry)
    const initialData = {
      timestamp: new Date(),
      horizontalSpeed: 0,
      verticalSpeed: 0,
      battery: 0,
      currLatti: 0,
      currLongi: 0,
      currAltitude: 0,
      temperature: -1
    };
    realtimeTelemetry.push(initialData);
    realtimeConfigurations = configData;
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
    if (!activeJourneyId) {
      return res.status(400).json({ error: "No active journey" });
    }
    // maine include kr diya hai ab bas main baat ye hai ki ye raspberry se aana chaiye
    const { horizontalSpeed, verticalSpeed, battery, currLatti, currLongi, currAltitude } = req.body;
    const temperature= liveTempreature;

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
      temperature,
    };

    realtimeTelemetry.push(telemetryData);
    journey.telemetry.push(telemetryData);
    journey.commands.push(commands);
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
    res.status(200).json({
      latestTelemetry,
      configurations: realtimeConfigurations, // Include configuration details
    });
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

    // Reset in-memory state only after successful update
    activeJourneyId = null;
    realtimeTelemetry = [];
    commands=[];    
    initialDroneData.batterySOC=0;
    initialDroneData.droneLatti=0.0;
    initialDroneData.droneLongi-0.0;

    res.status(200).json({ status: "Journey ended successfully." });
  } catch (error) {
    console.error("Error ending journey:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
