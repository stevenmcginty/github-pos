import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// WMO Weather interpretation codes
const WMO_CODES: { [key: number]: string } = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

const getWeatherDescription = (code: number): string => WMO_CODES[code] || 'Unknown weather';

// Main function to get weather summary for a day
export const getWeatherForDay = async (date: string): Promise<string> => {
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const weatherDocRef = doc(db, 'weather', date);

  try {
    const docSnap = await getDoc(weatherDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Check if summary property exists and is a string, even if empty.
      // This prevents re-fetching if a valid (but empty) summary was cached.
      if (data && typeof data.summary === 'string') {
        return data.summary;
      }
    }
  } catch (error) {
    console.warn('Could not read weather from cache, will fetch fresh.', error);
  }

  // St. Albans, UK coordinates
  const latitude = 51.75;
  const longitude = -0.34;
  const weatherApiUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${date}&end_date=${date}&hourly=temperature_2m,precipitation,weathercode`;
  
  const weatherResponse = await fetch(weatherApiUrl);
  if (!weatherResponse.ok) {
    throw new Error('Failed to fetch historical weather data.');
  }
  const weatherData = await weatherResponse.json();
  
  if (!weatherData.hourly || !weatherData.hourly.time) {
      throw new Error('Invalid weather data received from API.');
  }

  // Format data for AI prompt (6am to 6pm)
  const hourlyReport = weatherData.hourly.time
    .map((t: string, index: number) => ({
      time: new Date(t),
      temp: weatherData.hourly.temperature_2m[index],
      precipitation: weatherData.hourly.precipitation[index],
      weatherCode: weatherData.hourly.weathercode[index],
    }))
    .filter((d: any) => d.time.getHours() >= 6 && d.time.getHours() <= 18)
    .map((d: any) => 
        `Time: ${d.time.getHours()}:00, Weather: ${getWeatherDescription(d.weatherCode)}, Temp: ${d.temp}°C, Precipitation: ${d.precipitation}mm`
    )
    .join('\n');
    
  if (!hourlyReport) {
      const summary = 'No weather data available for business hours.';
      await setDoc(weatherDocRef, { summary, rawData: weatherData, date });
      return summary;
  }

  // Generate summary with Gemini via proxy
  const prompt = `
    You are a helpful assistant for a UK coffee shop owner analyzing past sales.
    Based on the following hourly weather data for St Albans, UK, provide a very brief, one-sentence summary of the weather between 06:00 and 18:00.
    Focus on conditions that would affect foot traffic, like sun, rain, or extreme temperatures.
    Do not mention specific times unless a significant event occurred.
    Example outputs: "A pleasant, sunny day perfect for outdoor seating.", "Overcast with persistent light rain, likely keeping customers away.", "A cold and windy morning followed by a brighter afternoon."

    Hourly Data:
    ${hourlyReport}
  `;
  
  const url = `${window.location.origin}/api-proxy/v1beta/models/gemini-2.5-flash:generateContent`;
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  const apiResponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!apiResponse.ok) {
      const errorBody = await apiResponse.json();
      throw new Error(errorBody.error?.message || `API request failed with status ${apiResponse.status}`);
  }

  const responseData = await apiResponse.json();
  const summaryText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!summaryText) {
    throw new Error("The AI returned an empty summary.");
  }
  
  const summary = summaryText.trim();

  // Save to Firestore cache
  await setDoc(weatherDocRef, { summary, rawData: weatherData, date });

  return summary;
};
