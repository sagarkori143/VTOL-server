import express, { json } from 'express';
import cors from 'cors';
import { connect } from 'mongoose';
import telemetryRoutes from './routes/telemetry.js';
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

app.use(cors({
  origin: '*', // Allows all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  allowedHeaders: ['Content-Type', 'Authorization'] 
}));

app.use(json());

// Mount telemetry and command routes
app.use('/api/telemetry', telemetryRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app; 
