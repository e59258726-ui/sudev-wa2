import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

export function initAI(apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
}

export async function generateAIResponse(prompt) {
    if (!genAI) throw new Error('AI не инициализирован');

    try {
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-flash'
        });

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 100,
                topP: 0.95,
                topK: 40
            }
        });

        return (await result.response).text().trim();
    } catch (error) {
        console.error('Ошибка AI:', error);
        return 'Извините, произошла ошибка';
    }
}

export async function generateMessage(context) {
    const { name, lastMessage, history } = context;
    let prompt = 'Ты обычный пользователь WhatsApp. Отвечай естественно, коротко (1-3 предложения), на русском.';

    if (history?.length) {
        prompt += `\n\nИстория:\n${history.join('\n')}`;
    }
    if (lastMessage) {
        prompt += `\n\nПоследнее сообщение: ${lastMessage}`;
    }
    if (name) {
        prompt += `\n\nИмя собеседника: ${name}`;
    }
    prompt += '\n\nТвой ответ (только текст):';

    return generateAIResponse(prompt);
}