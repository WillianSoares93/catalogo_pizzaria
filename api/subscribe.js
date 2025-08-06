// api/subscribe.js
// Esta é uma função Serverless do Vercel que lida com as inscrições de notificações push.

// Importa as funções necessárias do Firebase SDK
import { initializeApp, getApps } from 'firebase/app'; // getApps para verificar se já foi inicializado
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// Configuração do Firebase usando variáveis de ambiente do Vercel.
// É CRUCIAL que você configure estas variáveis no seu projeto Vercel.
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
    // measurementId: process.env.FIREBASE_MEASUREMENT_ID // Opcional
};

// Inicializa o aplicativo Firebase.
// Garante que o app é inicializado apenas uma vez para evitar erros em ambientes serverless.
let app;
if (!getApps().length) { // Verifica se já existe uma instância do app
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0]; // Se já inicializado, obtém a primeira instância existente
}

// Obtém a instância do Firestore
const db = getFirestore(app);

/**
 * @param {import('@vercel/node').VercelRequest} request - O objeto de requisição do Vercel.
 * @param {import('@vercel/node').VercelResponse} response - O objeto de resposta do Vercel.
 */
export default async function handler(request, response) {
    // A função só deve aceitar requisições POST
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const subscription = request.body;

        if (!subscription || !subscription.endpoint) {
            console.error('DEBUG: Requisição de inscrição inválida: endpoint ausente.');
            return response.status(400).json({ message: 'Push subscription is missing or invalid.' });
        }

        console.log('DEBUG: Recebida nova inscrição de notificação push para endpoint:', subscription.endpoint);

        try {
            // Adicionar a subscription a uma coleção 'pushSubscriptions' no Firestore.
            // É uma boa prática adicionar um timestamp para saber quando a inscrição foi feita.
            const docRef = await addDoc(collection(db, 'pushSubscriptions'), {
                ...subscription,
                timestamp: new Date() // Adiciona um carimbo de data/hora da inscrição
            });
            console.log('DEBUG: Inscrição salva no Firestore com ID:', docRef.id);

        } catch (dbError) {
            console.error('DEBUG: Erro ao salvar a inscrição no banco de dados Firestore:', dbError);
            return response.status(500).json({ message: 'Failed to save subscription to database.', error: dbError.message });
        }

        return response.status(201).json({ message: 'Push subscription received and processed successfully.' });

    } catch (error) {
        console.error('DEBUG: Erro inesperado no handler subscribe.js:', error);
        return response.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
