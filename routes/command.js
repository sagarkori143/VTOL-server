import express from 'express';
const router = express.Router();
import {droneCommand} from "../controllers/commandController.js"

// http://localhost:5000/api/command/send
router.post('/send', droneCommand);

export default router;
