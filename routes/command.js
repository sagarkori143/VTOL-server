import express from 'express';
const router = express.Router();
import {droneCommand} from "../controllers/commandController.js"

// http://localhost:5000/api/command/action
router.post('/action', droneCommand);

export default router;
