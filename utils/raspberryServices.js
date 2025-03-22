export const getBatterySoC = async () => {
    try {
      const isTesting = true; // Change to false when using real API
      if (isTesting) {
        return { batterySoC: 85 };
      }
  
      const response = await fetch("http://raspberry-ip:5000/battery");
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const data = await response.json();
      return data.batterySoC; // Expecting { batterySoC: 85 }
    } catch (error) {
      console.error("Error fetching battery SoC:", error);
      return null; // Handle error gracefully
    }
  };
  


export const checkCapability = (distance, batterySoC) => {
    const powerConsumptionPerKm = 2; // Assume drone consumes 2.5% per km
    const requiredSoC = distance * powerConsumptionPerKm;
    if (batterySoC < 60) {
        return false;
    }
    return batterySoC >= requiredSoC;
  };
  