const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Base Prompt for Gemini AI
const basePrompt = `
## Tentang
Kamu adalah customer service dari Universitas President yang berlokasi di Jababeka, Cikarang, Jawa Barat, Indonesia bernama PresFriend. 

## Tugas
Tugas kamu adalah menjawab pertanyaan terkait mata kuliah. Kamu hanya menjawab dalam 1 paragraf saja dengan bahasa Indonesia yang sopan dan ramah tanpa emoticon.

## Panggilan
Selalu panggil dengan "Kak"/ "Kakak" / "PresJos" dan hindari memanggil dengan sebutan "Anda". 

## Batasan
Jawab hanya yang kamu tahu saja. Arahkan mereka untuk kontak ke admission@president.ac.id jika terdapat kendala. 

## Rekomendasi
Kamu juga dapat memberikan rekomendasi mata kuliah dari data yang kamu punya jika mereka menanyakan rekomendasi yang diambil. Tanyakan dulu mengenai keinginan profesi dia, dan jumlah maksimal mata kuliah yang bisa diambil. Kemudian cocokkan dengan data yang kamu punya. Rekomendasikan setidaknya 5 mata kuliah.
`;

// Initialize WhatsApp Client
const client = new Client();

// Log when the client is ready
client.once('ready', () => console.log('WhatsApp Client is ready!'));

// Generate QR Code for WhatsApp Web Login
client.on('qr', qr => qrcode.generate(qr, { small: true }));

// Generate AI Response
const generateResponse = async (aiPrompt) => {
    try {
        const result = await model.generateContent(aiPrompt);
        return result.response.text();
    } catch (error) {
        console.error('Error generating AI response:', error);
        return "Maaf Kak, sistem sedang mengalami gangguan. Silakan hubungi admission@president.ac.id untuk bantuan lebih lanjut.";
    }
};

// Handle Incoming Messages
client.on('message_create', async (message) => {
    const messageText = message.body.toLowerCase();

    if (messageText.startsWith('tanya,') || messageText.startsWith('bertanya,') || messageText.startsWith('bagaimana cara,') || messageText.startsWith('info,')) {
        // Extract user query after keyword
        const userQuery = message.body.split(',').slice(1).join(',').trim();

        const aiPrompt = `
${basePrompt}

## Pertanyaan Pengguna
${userQuery}
        `;

        const response = await generateResponse(aiPrompt);
        client.sendMessage(message.from, response);
    } else if (messageText.startsWith('rekomendasi,')) {
        // Extract user query details for recommendation
        const userQuery = message.body.substring(12).trim();
        const [profession, maxCoursesText] = userQuery.split(',');
        const maxCourses = parseInt(maxCoursesText?.match(/\d+/)?.[0], 10) || 'Tidak disebutkan';

        const aiPrompt = `
${basePrompt}

## Profesi yang Diharapkan
${profession.trim()}

## Jumlah Maksimal Mata Kuliah
${maxCourses}

## Tugasmu
Berikan rekomendasi minimal 5 mata kuliah sesuai data yang kamu miliki berdasarkan profesi dan jumlah mata kuliah yang disebutkan.
        `;

        const response = await generateResponse(aiPrompt);
        client.sendMessage(message.from, response);
    } else {
        // Default response for unrecognized messages
        client.sendMessage(message.from, "Maaf Kak, pertanyaan tidak dikenali. Silakan gunakan format yang benar seperti 'tanya,' atau 'rekomendasi,' untuk mendapatkan bantuan.");
    }
});

// Start WhatsApp Client
client.initialize();
