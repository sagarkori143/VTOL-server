import { Router } from 'express';
const router = Router();
import { startJourney, updateJourney, getLatestTelemetry, checkFeasibility, endJourney, command, droneDetails, getDroneLocation, getCommand } from '../controllers/telemetryController.js';

// Route for the drone to upload its battery and location when turned on
router.post('/drone', droneDetails)
// Route for getting the above mentioned data
router.get('/from',getDroneLocation)

// Route to check if the journey is possible to commence
router.post('/check',checkFeasibility) // http://localhost:5000/api/telemetry/check


// Route to start a new journey with the first telemetry data
router.post('/start', startJourney); // used by apps/website

// Route for uploading any command for the drone
router.post('/command',command)
router.get('/command',getCommand);

// Route to update the current journey with new telemetry data
router.put('/update', updateJourney); // will be used by the raspberry

// Route to get the latest telemetry data
router.get('/', getLatestTelemetry); // anyone can use

// Route to terminate the current journey
router.delete('/end',endJourney); // anyone can use

export default router;
