const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key-to-prevent-crash',
});

if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY is missing. AI chat features will fail.');
}

// AI Chat endpoint
router.post('/chat', async (req, res) => {
    try {
        const { message, context = "business assistant" } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const systemPrompt = `You are a helpful AI business assistant for VBMS (Video Business Management System). 
    You help business owners with:
    - Business strategy and operations
    - Video surveillance and monitoring advice
    - Task management and productivity
    - Customer service best practices
    - Technology integration
    - General business questions

    Keep responses helpful, professional, and concise. Focus on practical business advice.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            max_tokens: 500,
            temperature: 0.7,
        });

        const aiResponse = completion.choices[0].message.content;

        res.json({
            response: aiResponse,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('OpenAI API Error:', error);

        // Fallback response if API fails
        const fallbackResponse = "I'm sorry, I'm experiencing technical difficulties right now. Please try again in a moment, or contact support for assistance.";

        res.json({
            response: fallbackResponse,
            timestamp: new Date().toISOString(),
            fallback: true
        });
    }
});

module.exports = router;
