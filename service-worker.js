// service-worker.js

// Versão do cache para controle de atualizações
const CACHE_VERSION = 'v1.0.1'; // Incremente esta versão a cada mudança no SW
const CACHE_NAME = `samiacardapio-cache-${CACHE_VERSION}`;

// Lista de arquivos para pré-cache (adicione todos os seus assets estáticos importantes)
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap',
    'https://raw.githubusercontent.com/WillianSoares93/catalogo_pizzaria/refs/heads/main/logo.png',
    // Adicione outras imagens, CSS, JS que seu site usa e que devem ser offline
    'https://upload.wikimedia.org/wikipedia/commons/9/91/Pizza-3007395.jpg', // Imagem padrão de pizza
    'https://invexo.com.br/blog/wp-content/uploads/2022/12/pizza-pizzaria-gavea-rio-de-janeiro.jpg' // Imagem de fundo do header
];

// Evento 'install': Ocorre quando o Service Worker é instalado pela primeira vez
self.addEventListener('install', (event) => {
    console.log('Service Worker: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Pré-caching de arquivos.');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Service Worker: Falha no pré-caching:', error);
            })
    );
    self.skipWaiting(); // Força a ativação do novo Service Worker imediatamente
});

// Evento 'activate': Ocorre quando o Service Worker é ativado
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Ativando...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName.startsWith('samiacardapio-cache-') && cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deletando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Garante que o Service Worker controla todas as páginas abertas após a ativação
    clients.claim();
    console.log('Service Worker: Ativado e controlando clientes.');
});

// Evento 'fetch': Intercepta requisições de rede
self.addEventListener('fetch', (event) => {
    // Ignora requisições para a API do Vercel para que não sejam cacheadas de forma agressiva
    // e sempre busquem os dados mais recentes.
    if (event.request.url.includes('/api/')) {
        return fetch(event.request); // Apenas passa a requisição adiante para a rede
    }

    // Estratégia Cache-First, Network-Fallback para outros recursos
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Retorna o recurso do cache se encontrado
                if (response) {
                    return response;
                }
                // Se não estiver no cache, busca na rede
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Tenta adicionar a resposta da rede ao cache para futuras requisições
                        // Verifica se a resposta é válida antes de adicionar ao cache
                        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Se falhar na rede e não estiver em cache, pode servir uma página offline
                        // ou um fallback para imagens.
                        console.warn('Service Worker: Falha ao buscar recurso da rede:', event.request.url);
                        // Exemplo de fallback para imagens:
                        if (event.request.destination === 'image') {
                            return caches.match('https://upload.wikimedia.org/wikipedia/commons/9/91/Pizza-3007395.jpg'); // Uma imagem padrão
                        }
                        // Pode adicionar um fallback para páginas HTML aqui
                        // return caches.match('/offline.html');
                    });
            })
    );
});


// --- Lógica de Notificações Push ---

// Evento 'push': Ocorre quando uma notificação push é recebida
self.addEventListener('push', (event) => {
    console.log('Service Worker: Notificação push recebida!', event.data);

    let data;
    try {
        data = event.data.json(); // Tenta parsear o payload como JSON
    } catch (e) {
        data = { // Se não for JSON, usa um formato padrão
            title: 'Nova Mensagem',
            body: event.data.text(),
            url: '/' // URL padrão
        };
    }

    const title = data.title || 'Sâmia Cardápio';
    const options = {
        body: data.body || 'Confira nossas últimas promoções e novidades!',
        icon: '/logo.png', // Ícone que aparecerá na notificação
        badge: '/logo.png', // Ícone pequeno para a barra de status (Android)
        data: {
            url: data.url || '/' // URL para abrir quando a notificação for clicada
        },
        vibrate: [200, 100, 200], // Padrão de vibração
        tag: 'samiacardapio-notification', // Agrupa notificações para que apenas uma seja exibida por vez com esta tag
        renotify: true // Re-notifica se uma nova notificação com a mesma tag chegar
    };

    // Exibe a notificação para o usuário
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Evento 'notificationclick': Ocorre quando o usuário clica na notificação
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notificação clicada!', event.notification);
    event.notification.close(); // Fecha a notificação após o clique

    const urlToOpen = event.notification.data.url || '/'; // Pega a URL do payload da notificação

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }) // Busca todas as janelas (abas/PWA)
            .then((clientList) => {
                for (const client of clientList) {
                    // Se o PWA já estiver aberto e na URL correta, foca nele
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Se o PWA não estiver aberto ou na URL correta, abre uma nova janela
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
