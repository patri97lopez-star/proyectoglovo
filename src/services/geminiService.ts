import { GoogleGenAI } from "@google/genai";

export async function analyzeIncidents(incidents: any[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return "⚠️ El análisis de IA no está disponible porque no se ha configurado la API Key de Gemini en los secretos del proyecto.";
  }

  if (incidents.length === 0) {
    return "No hay incidencias suficientes para realizar un análisis significativo en este momento.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Eres un experto en operaciones logísticas de Glovo en Madrid. 
      Analiza la siguiente lista de incidencias operativas en tiempo real y proporciona:
      1. Un resumen ejecutivo muy breve de la situación.
      2. Recomendaciones críticas inmediatas (ej. reasignar flotas, avisar a soporte).
      3. Identificación de la zona más problemática.

      Usa un tono profesional y conciso. Responde en español.

      Incidencias actuales:
      ${JSON.stringify(incidents, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    return response.text || "La IA no pudo generar una respuesta clara. Inténtalo de nuevo.";
  } catch (error) {
    console.error("Gemini SDK Error:", error);
    return "❌ Error al conectar con el servicio de IA. Por favor, verifica la conexión o intenta más tarde.";
  }
}
