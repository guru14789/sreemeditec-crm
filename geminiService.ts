import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// --- Fallback Generators for robust demo experience ---

const getFallbackEmail = (leadName: string, product: string) => {
  return `Subject: Regarding your interest in ${product}

Dear ${leadName},

Thank you for your interest in the ${product}. At MedEquip 360, we pride ourselves on providing top-tier medical solutions.

This equipment features state-of-the-art diagnostics that align perfectly with your facility's requirements. I would love to schedule a brief 10-minute call to discuss how we can support your implementation.

Best regards,
[Your Name]
MedEquip 360 Sales Team`;
};

const getFallbackAnalysis = (issue: string) => {
  return `**Analysis for: ${issue}**

1. **Power Supply Fluctuation**: The intermittent warning often suggests unstable voltage rails. Check the PSU output under load.
2. **Sensor Calibration Drift**: Over time, sensors may drift. Perform a standard calibration routine using phantom references.
3. **Firmware Version Mismatch**: Ensure the control module firmware matches the sensor interface version.

**Recommended Tools:**
- Fluke Multimeter
- Calibration Phantom Kit
- Service Laptop with Diagnostics Suite`;
};

const getFallbackInsights = () => {
  return `**Key Business Insights:**

1. **Inventory Optimization**: High turnover in consumable items (Gels, Syringes) suggests increasing safety stock levels by 15% to prevent potential stockouts next month.
2. **Service Revenue Opportunity**: You have 3 high-value AMC contracts expiring soon. Proactive renewal now could secure $45k in revenue before Q4 ends.`;
};

// --- API Functions ---

export const generateEmailDraft = async (leadName: string, product: string, tone: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return getFallbackEmail(leadName, product);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Draft a short, professional sales email to ${leadName} from a medical equipment supplier regarding their interest in ${product}. Tone: ${tone}. Keep it under 150 words.`,
    });
    return response.text || getFallbackEmail(leadName, product);
  } catch (error) {
    console.error("Gemini API Error (Email):", error);
    return getFallbackEmail(leadName, product);
  }
};

export const analyzeServiceTicket = async (issueDescription: string): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return getFallbackAnalysis(issueDescription);
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a medical equipment technician expert. Analyze this issue: "${issueDescription}". Suggest 3 potential root causes and recommended tools to bring to the site. Format as a bulleted list.`,
      });
      return response.text || getFallbackAnalysis(issueDescription);
    } catch (error) {
      console.error("Gemini API Error (Analysis):", error);
      return getFallbackAnalysis(issueDescription);
    }
  };

export const generateInsights = async (dataContext: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return getFallbackInsights();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following CRM data summary and provide 2 key actionable insights for a medical equipment business owner: ${dataContext}`,
    });
    return response.text || getFallbackInsights();
  } catch (error) {
    console.error("Gemini API Error (Insights):", error);
    return getFallbackInsights();
  }
};