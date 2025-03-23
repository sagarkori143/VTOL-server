import { Raspberry } from "../models/Raspberry.js";

// POST: Save or update Raspberry Pi URL
export const updateRaspberryUrl = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    // Check if a record exists, update if found, otherwise create new
    const raspberry = await Raspberry.findOneAndUpdate(
      {}, // No filter, since we keep only one record
      { url, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: 'URL updated successfully', data: raspberry });
  } catch (error) {
    res.status(500).json({ message: 'Error updating URL', error: error.message });
  }
};

// GET: Fetch the latest Raspberry Pi URL
export const getRaspberryUrl = async (req, res) => {
  try {
    const raspberry = await Raspberry.findOne();

    if (!raspberry) {
      return res.status(404).json({ message: 'No Raspberry URL found' });
    }

    res.status(200).json({ url: raspberry.url, updatedAt: raspberry.updatedAt });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching URL', error: error.message });
  }
};
