import { Journey } from "../models/journey.js"; // Import Journey model

export const droneCommand = async (req, res) => {
  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: "Command is required" });
    }

    // Fetch the Raspberry Pi URL from your API
    const urlResponse = await fetch("https://vtol-server.onrender.com/api/telemetry/url");
    const urlData = await urlResponse.json();
    const raspberryPiUrl = urlData?.url;

    if (!raspberryPiUrl || raspberryPiUrl === "null") {
      return res.status(500).json({ error: "Raspberry Pi URL not available" });
    }

    // Define the full command API endpoint
    const raspberryCommandUrl = `${raspberryPiUrl}/execute-command`;

    // Forward the command to Raspberry Pi
    const response = await fetch(raspberryCommandUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });

    const responseData = await response.json();

    if (response.ok) {
      // Save the executed command to the database
      await Journey.updateOne(
        { journeyId: activeJourneyId }, // Find the active journey
        { $push: { commands: command } } // Append the new command
      );

      return res.status(200).json({
        message: `Command "${command}" executed and saved successfully`,
        responseFromPi: responseData,
      });
    } else {
      return res.status(500).json({
        error: `Failed to execute command "${command}" on Raspberry Pi`,
        responseFromPi: responseData,
      });
    }
  } catch (error) {
    console.error("Error sending command to Raspberry Pi:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
