import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const generateSmartSuggestions = async (context: string, lastMessage: string, roomInfo: string) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.warn('GEMINI_API_KEY not found in environment variables');
            return [];
        }

        const prompt = `
        You are an AI assistant for LedgerX, a professional business and financial management platform.
        Your goal is to suggest 3 premium, context-aware replies to the last message.
        
        Room Information: ${roomInfo}
        Conversation History:
        ${context}

        LAST MESSAGE: "${lastMessage}"

        STRICT RULES:
        1. Professional & Crisp: Replies must be professional, helpful, and concise (max 12 words).
        2. Language Match: Detect the language of the last message. 
           - If it's English, provide English suggestions.
           - If it's an Indian language (Hindi, Bengali, Marathi, Tamil, Telugu, etc.), provide replies in that specific language.
           - If it's "Hinglish" (Hindi + English), provide Hinglish suggestions.
        3. Action-Oriented: Suggest specific actions like "I'll review the ledger now", "Payment received", "Let's discuss this further".
        4. Diversity: Ensure the 3 suggestions cover different tones (e.g., Affirmative, Questioning, Action-oriented).
        5. JSON ONLY: Return ONLY a raw JSON array of 3 strings.

        Example: ["The transaction is verified.", "Can you share the invoice?", "I'll update the records."]
        `;

        const modelNames = ['gemini-flash-latest', 'gemini-pro-latest', 'gemini-2.0-flash'];
        let result = null;
        let lastError = null;

        for (const modelName of modelNames) {
            try {
                const model = genAI.getGenerativeModel(
                    { model: modelName }
                );
                result = await model.generateContent(prompt);
                if (result) {
                    console.log(`Successfully generated suggestions using ${modelName}`);
                    break;
                }
            } catch (err: any) {
                lastError = err;
                if (err.message?.includes('429') || err.message?.includes('quota')) {
                    console.warn(`Model ${modelName} quota exceeded, trying next...`);
                } else {
                    console.warn(`Model ${modelName} failed, trying next...`, err.message);
                }
                continue;
            }
        }

        if (!result) {
            throw lastError || new Error('All models failed');
        }
        const response = await result.response;
        const text = response.text();

        // Clean the text in case Gemini adds markdown code blocks
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            return JSON.parse(cleanedText);
        } catch (e) {
            console.error('Failed to parse AI suggestions:', text);
            return [];
        }
    } catch (error) {
        console.error('AI Suggestion Error:', error);
        return [];
    }
};
