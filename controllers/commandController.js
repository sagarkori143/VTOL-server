export const droneCommand = async (req, res) => {
  try {
    const { command, latitude, longitude } = req.body;

    if (!command) {
      return res.status(400).json({ error: "Command is required" });
    }

    // Define Raspberry Pi API endpoint
    const raspberryPiUrl = "http://raspberry-ip:5000/execute-command";

    // Build request body
    const requestBody = { command };
    if (latitude && longitude) {
      requestBody.latitude = latitude;
      requestBody.longitude = longitude;
    }

    // Forward the command to Raspberry Pi
    const response = await fetch(raspberryPiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();
    res.status(200).json({
      message: "Command sent successfully",
      responseFromPi: responseData,
    });

  } catch (error) {
    console.error("Error sending command to Raspberry Pi:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
