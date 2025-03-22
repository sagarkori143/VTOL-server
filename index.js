import express, { json } from 'express';
import cors from 'cors';
import { connect } from 'mongoose';
import telemetryRoutes from './routes/telemetry.js';
import commandRoutes from './routes/command.js';  // Assuming you have this already
import dotenv from 'dotenv';
dotenv.config();
const app = express();

const port = process.env.PORT || 5000;
const mongoString = process.env.MONGO_URI;  // Ensure it's loaded

if (!mongoString) {
    console.error('MongoDB URI is missing! Check your .env file.');
    process.exit(1);
}

// Connect to MongoDB
connect(mongoString, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(json());

// Mount telemetry and command routes
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/command', commandRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app; 
