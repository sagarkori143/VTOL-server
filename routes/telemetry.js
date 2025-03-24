import { Router } from 'express';
const router = Router();
import { startJourney, updateJourney, getLatestTelemetry, checkFeasibility, endJourney } from '../controllers/telemetryController.js';
import { getRaspberryUrl, updateRaspberryUrl } from '../controllers/raspberryController.js';

// Route to check if the journey is possible to commence
router.post('/check',checkFeasibility) // http://localhost:5000/api/telemetry/check

router.post('/url',updateRaspberryUrl);
router.get('/url',getRaspberryUrl);

// Route to start a new journey with the first telemetry data
router.post('/start', startJourney); // used by apps/website

// Route to update the current journey with new telemetry data
router.put('/update', updateJourney); // will be used by the raspberry

// Route to get the latest telemetry data
router.get('/', getLatestTelemetry); // anyone can use

// Route to terminate the current journey
router.delete('/end',endJourney); // anyone can use

export default router;
