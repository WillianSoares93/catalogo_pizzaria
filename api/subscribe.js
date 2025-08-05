// api/subscribe.js
// Esta é uma função Serverless do Vercel que lida com as inscrições de notificações push.

/**
 * @param {import('@vercel/node').VercelRequest} request - O objeto de requisição do Vercel.
 * @param {import('@vercel/node').VercelResponse} response - O objeto de resposta do Vercel.
 */
export default async function handler(request, response) {
    // A função só deve aceitar requisições POST
    if (request.method !== 'POST') {
        // Se não for POST, retorna um erro 405 (Method Not Allowed)
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // O corpo da requisição deve conter a PushSubscription
        // A PushSubscription é um objeto gerado pelo navegador que identifica o usuário para notificações push.
        const subscription = request.body;

        // Validação básica da subscription para garantir que não está vazia
        if (!subscription || !subscription.endpoint) {
            console.error('DEBUG: Requisição de inscrição inválida: endpoint ausente.');
            return response.status(400).json({ message: 'Push subscription is missing or invalid.' });
        }

        console.log('DEBUG: Recebida nova inscrição de notificação push:', subscription.endpoint);

        // --- INÍCIO DA LÓGICA DE ARMAZENAMENTO NO BANCO DE DADOS ---
        // ATENÇÃO: Esta é uma seção de placeholder.
        // Você PRECISARÁ substituir esta parte pela sua lógica real de banco de dados.
        // Exemplos de bancos de dados que você pode usar:
        // - Firestore (Firebase)
        // - MongoDB Atlas
        // - PostgreSQL (com um provedor como Supabase, PlanetScale, Neon)
        // - Redis (para cache de subscriptions se o volume for muito alto)

        // Exemplo conceitual de como você armazenaria a subscription:
        /*
        import { getFirestore, collection, addDoc } from 'firebase/firestore';
        import { initializeApp } from 'firebase/app';

        // Certifique-se de inicializar o Firebase App uma única vez
        // const firebaseConfig = { ... }; // Suas credenciais do Firebase
        // const app = initializeApp(firebaseConfig);
        // const db = getFirestore(app);

        try {
            // Adicionar a subscription a uma coleção 'pushSubscriptions'
            const docRef = await addDoc(collection(db, 'pushSubscriptions'), subscription);
            console.log('DEBUG: Inscrição salva no Firestore com ID:', docRef.id);
            // Você pode adicionar um campo de timestamp ou userId se tiver autenticação
        } catch (dbError) {
            console.error('DEBUG: Erro ao salvar a inscrição no banco de dados:', dbError);
            // Retorna um erro 500 se o banco de dados falhar
            return response.status(500).json({ message: 'Failed to save subscription to database.' });
        }
        */

        // Por enquanto, apenas para simular sucesso:
        console.log('DEBUG: Lógica de armazenamento de banco de dados placeholder executada com sucesso.');
        // --- FIM DA LÓGICA DE ARMAZENAMENTO NO BANCO DE DADOS ---

        // Retorna uma resposta de sucesso 201 (Created)
        return response.status(201).json({ message: 'Push subscription received and processed successfully.' });

    } catch (error) {
        // Captura quaisquer outros erros que possam ocorrer durante o processamento
        console.error('DEBUG: Erro no handler subscribe.js:', error);
        return response.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
