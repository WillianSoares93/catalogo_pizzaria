// api/send-notification.js
// Esta função Serverless do Vercel lê a planilha de notificações e envia notificações push.

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { credential } from 'firebase-admin';
import webpush from 'web-push';
import fetch from 'node-fetch'; // Para buscar o CSV da planilha

// --- Configuração do Firebase Admin SDK ---
// As credenciais da Service Account do Firebase devem ser configuradas como variáveis de ambiente no Vercel.
// FIREBASE_PROJECT_ID: O ID do seu projeto Firebase.
// FIREBASE_ADMIN_PRIVATE_KEY: A chave privada do seu arquivo JSON de Service Account (substitua \\n por \n).
// FIREBASE_ADMIN_CLIENT_EMAIL: O e-mail da sua Service Account.
const firebaseAdminConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'), // Importante: substitui \\n por nova linha real
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL
};

// Inicializa o Firebase Admin SDK (apenas uma vez)
let adminApp;
if (!getApps().length) {
    adminApp = initializeApp({
        credential: credential.cert(firebaseAdminConfig)
    });
} else {
    adminApp = getApp(); // Se já inicializado, obtém a instância existente
}

const db = getFirestore(adminApp);

// --- Configuração do Web-Push ---
// As chaves VAPID devem ser configuradas como variáveis de ambiente no Vercel.
// VAPID_PUBLIC_KEY: Sua chave pública VAPID.
// VAPID_PRIVATE_KEY: Sua chave privada VAPID.
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
};

// Substitua pelo seu e-mail de contato para o VAPID
webpush.setVapidDetails(
    'mailto:seu-email@exemplo.com', // <-- SUBSTITUA PELO SEU E-MAIL
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

// --- URL da Planilha de Notificações ---
// Use o link da sua planilha de notificações publicada como CSV.
const NOTIFICATIONS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=1983804831&single=true&output=csv';

// Função auxiliar para parsear dados CSV
function parseCsvData(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headersRaw = lines[0].split(',').map(h => h.trim());
    const mappedHeaders = headersRaw.map(header => {
        switch (header) {
            case 'ID Notificacao': return 'id';
            case 'Titulo': return 'title';
            case 'Mensagem': return 'message';
            case 'URL de Destino (Opcional)': return 'url';
            case 'Ativo (SIM/NAO)': return 'active';
            case 'Data de Criacao': return 'createdAt';
            default: return header.replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '').replace(/^./, (match) => match.toLowerCase());
        }
    });

    const parsedData = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length === mappedHeaders.length) {
            let item = {};
            for (let j = 0; j < mappedHeaders.length; j++) {
                let headerKey = mappedHeaders[j];
                let value = values[j] ? values[j].trim() : '';
                if (headerKey === 'active') {
                    item[headerKey] = value.toUpperCase() === 'SIM';
                } else if (headerKey === 'createdAt') {
                    item[headerKey] = new Date(value);
                } else {
                    item[headerKey] = value;
                }
            }
            parsedData.push(item);
        }
    }
    return parsedData;
}

/**
 * @param {import('@vercel/node').VercelRequest} request - O objeto de requisição do Vercel.
 * @param {import('@vercel/node').VercelResponse} response - O objeto de resposta do Vercel.
 */
export default async function handler(request, response) {
    // Esta função pode ser acionada por um POST (ex: webhook do Google Apps Script)
    // ou por um GET para testes manuais. Para produção, POST é mais seguro.
    if (request.method !== 'POST' && request.method !== 'GET') {
        response.setHeader('Allow', 'POST, GET');
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        console.log('DEBUG: send-notification.js: Iniciando processo de envio de notificações.');

        // 1. Buscar notificações da planilha
        const notificationsResponse = await fetch(NOTIFICATIONS_CSV_URL);
        if (!notificationsResponse.ok) {
            throw new Error(`Erro ao buscar notificações da planilha: ${notificationsResponse.statusText}`);
        }
        const notificationsCsvText = await notificationsResponse.text();
        const allNotifications = parseCsvData(notificationsCsvText);
        
        // Filtra as notificações ativas.
        // Se você quiser enviar apenas notificações NOVAS, precisaria de um sistema
        // para marcar notificações como "enviadas" ou filtrar por data de criação
        // e um timestamp da última vez que a função foi executada.
        const activeNotifications = allNotifications.filter(n => n.active);

        if (activeNotifications.length === 0) {
            console.log('DEBUG: Nenhuma notificação ativa encontrada na planilha.');
            return response.status(200).json({ message: 'No active notifications to send.' });
        }

        // 2. Buscar todas as inscrições de push do Firestore
        const subscriptionsSnapshot = await db.collection('pushSubscriptions').get();
        const subscriptions = subscriptionsSnapshot.docs.map(doc => doc.data());

        if (subscriptions.length === 0) {
            console.log('DEBUG: Nenhuma inscrição de push encontrada no Firestore.');
            return response.status(200).json({ message: 'No push subscriptions found.' });
        }

        console.log(`DEBUG: Encontradas ${activeNotifications.length} notificações ativas e ${subscriptions.length} inscrições.`);

        // 3. Enviar notificações
        const sendPromises = [];
        const failedSubscriptions = [];

        for (const notification of activeNotifications) {
            const payload = JSON.stringify({
                title: notification.title,
                body: notification.message,
                url: notification.url // Inclui a URL de destino
            });

            for (const sub of subscriptions) {
                // webpush.sendNotification espera um objeto PushSubscription JSON
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: sub.keys
                };

                sendPromises.push(
                    webpush.sendNotification(pushSubscription, payload)
                        .then(() => console.log(`DEBUG: Notificação enviada para: ${sub.endpoint}`))
                        .catch(error => {
                            console.error(`DEBUG: Falha ao enviar notificação para ${sub.endpoint}:`, error);
                            // Se o erro for 404 (Gone) ou 410 (GCM_SENDER_ID_MISMATCH), a subscription é inválida e deve ser removida.
                            if (error.statusCode === 404 || error.statusCode === 410) {
                                failedSubscriptions.push(sub);
                                console.log(`DEBUG: Inscrição inválida marcada para remoção: ${sub.endpoint}`);
                            }
                        })
                );
            }
        }

        await Promise.allSettled(sendPromises); // Espera que todas as promessas sejam resolvidas

        // 4. Remover inscrições falhas do Firestore (opcional, mas recomendado para limpeza)
        if (failedSubscriptions.length > 0) {
            console.log(`DEBUG: Removendo ${failedSubscriptions.length} inscrições inválidas...`);
            const deletePromises = failedSubscriptions.map(sub => 
                db.collection('pushSubscriptions').where('endpoint', '==', sub.endpoint).get()
                    .then(snapshot => {
                        snapshot.forEach(doc => {
                            console.log(`DEBUG: Deletando doc ID: ${doc.id}`);
                            return doc.ref.delete();
                        });
                    })
                    .catch(deleteError => console.error('DEBUG: Erro ao deletar inscrição falha:', deleteError))
            );
            await Promise.allSettled(deletePromises);
            console.log('DEBUG: Remoção de inscrições inválidas concluída.');
        }

        return response.status(200).json({ message: 'Notification process completed.', sentCount: sendPromises.length - failedSubscriptions.length, failedCount: failedSubscriptions.length });

    } catch (error) {
        console.error('DEBUG: Erro no handler send-notification.js:', error);
        return response.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
