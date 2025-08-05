// Este arquivo é uma função Serverless para o Vercel.
// Ele é responsável por buscar os dados do cardápio e promoções de planilhas Google Sheets
// publicadas como CSV e retorná-los para a aplicação front-end.
//
// Para garantir que o Node.js no ambiente Vercel trate este arquivo como um módulo ES (permitindo 'import'),
// você deve ter "type": "module" no seu arquivo package.json.

import fetch from 'node-fetch'; // Importa a biblioteca 'node-fetch' para fazer requisições HTTP

// URLs das suas planilhas Google Sheets publicadas como CSV.
// É CRÍTICO que estas URLs estejam corretas e que as planilhas estejam configuradas
// para serem "Visíveis para qualquer pessoa com o link".
const CARDAPIO_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=664943668&single=true&output=csv'; 
const PROMOCOES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=600393470&single=true&output=csv'; 

// ATENÇÃO: Não há nenhuma URL ou lógica relacionada a taxas de entrega neste arquivo.
// A funcionalidade de frete dinâmico foi completamente removida desta função Serverless.

// A função principal que será exportada e executada pelo Vercel.
// 'req' é o objeto de requisição (request) e 'res' é o objeto de resposta (response).
export default async (req, res) => {
    // Define cabeçalhos de cache para otimizar o desempenho no Vercel.
    // 's-maxage=300' significa que o CDN do Vercel irá cachear a resposta por 300 segundos (5 minutos).
    // 'stale-while-revalidate' permite que o CDN sirva uma versão cacheada enquanto busca uma nova em segundo plano.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); 

    try {
        console.log('Vercel Function: Iniciando processo de busca de dados...');

        // --- 1. Busca os dados do Cardápio ---
        console.log('Vercel Function: Tentando buscar dados do Cardápio da URL:', CARDAPIO_CSV_URL);
        const cardapioResponse = await fetch(CARDAPIO_CSV_URL);

        // Verifica se a requisição do cardápio foi bem-sucedida (status 200 OK)
        if (!cardapioResponse.ok) {
            // Se a resposta não for OK, tenta ler o corpo da resposta para mais detalhes
            const errorText = await cardapioResponse.text(); 
            console.error(`Vercel Function: Erro HTTP ao buscar Cardápio. Status: ${cardapioResponse.status}, StatusText: ${cardapioResponse.statusText}. Corpo da Resposta (parcial): ${errorText.substring(0, 200)}...`);
            // Lança um erro para ser capturado pelo bloco catch
            throw new Error(`Falha ao buscar o cardápio: ${cardapioResponse.statusText || 'Erro desconhecido'}`);
        }
        // Converte a resposta para texto (conteúdo CSV)
        const cardapioData = await cardapioResponse.text();
        console.log('Vercel Function: Dados do Cardápio buscados com sucesso.');

        // --- 2. Busca os dados das Promoções ---
        console.log('Vercel Function: Tentando buscar dados das Promoções da URL:', PROMOCOES_CSV_URL);
        const promocoesResponse = await fetch(PROMOCOES_CSV_URL);

        // Verifica se a requisição das promoções foi bem-sucedida
        if (!promocoesResponse.ok) {
            // Se a resposta não for OK, tenta ler o corpo da resposta para mais detalhes
            const errorText = await promocoesResponse.text();
            console.error(`Vercel Function: Erro HTTP ao buscar Promoções. Status: ${promocoesResponse.status}, StatusText: ${promocoesResponse.statusText}. Corpo da Resposta (parcial): ${errorText.substring(0, 200)}...`);
            // Lança um erro para ser capturado pelo bloco catch
            throw new Error(`Falha ao buscar as promoções: ${promocoesResponse.statusText || 'Erro desconhecido'}`);
        }
        // Converte a resposta para texto (conteúdo CSV)
        const promocoesData = await promocoesResponse.text();
        console.log('Vercel Function: Dados das Promoções buscados com sucesso.');

        // --- 3. Envia a resposta de sucesso ---
        console.log('Vercel Function: Todos os dados (cardápio e promoções) foram buscados com sucesso. Enviando resposta JSON.');
        res.status(200).json({
            cardapio: cardapioData,  // Inclui os dados CSV do cardápio
            promocoes: promocoesData // Inclui os dados CSV das promoções
            // Não há mais o campo 'deliveryFees' aqui.
        });

    } catch (error) {
        // --- Tratamento de Erros ---
        // Se qualquer erro ocorrer durante as operações de fetch ou processamento,
        // ele será capturado aqui.
        console.error('Vercel Function: Erro fatal capturado no bloco try-catch:', error.message);
        // Envia uma resposta de erro 500 (Internal Server Error) para o cliente.
        res.status(500).json({ error: `Erro interno no servidor ao carregar dados: ${error.message}` });
    }
};
