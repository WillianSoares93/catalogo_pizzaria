// Para usar 'import' em vez de 'require' em Serverless Functions do Vercel,
// você precisa garantir que o ambiente Node.js trate este arquivo como um módulo ES.
// A forma mais comum de fazer isso é adicionando "type": "module" no seu package.json
// ou renomeando o arquivo para .mjs.
// No Vercel, a forma mais simples é garantir que o package.json esteja configurado corretamente.
// O erro "ERR_REQUIRE_ESM" indica que o Vercel está tratando este arquivo como CommonJS.

// A solução é garantir que o package.json na raiz do seu projeto tenha:
// {
//   "type": "module"
// }
// E que 'node-fetch' seja importado como abaixo.

import fetch from 'node-fetch';

// ATENÇÃO: Substitua esta URL pela URL CSV DA SUA PLANILHA DE CARDÁPIO PUBLICADA.
// Exemplo: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=664943668&single=true&output=csv'
const CARDAPIO_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=664943668&single=true&output=csv'; 
const PROMOCOES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5V8OSL/pub?gid=600393470&single=true&output=csv';
// NOVO: URL para a planilha de taxas de entrega
const DELIVERY_FEES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=45140418&single=true&output=csv';

export default async (req, res) => {
    // Define o cabeçalho Cache-Control para 5 minutos (300 segundos)
    // 's-maxage=300' instrui a CDN do Vercel a armazenar em cache por 300 segundos.
    // 'stale-while-revalidate' permite que a CDN sirva o cache antigo enquanto busca uma nova versão em segundo plano.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); 

    try {
        // Busca os dados do cardápio, promoções e taxas de entrega em paralelo
        const [cardapioResponse, promocoesResponse, deliveryFeesResponse] = await Promise.all([
            fetch(CARDAPIO_CSV_URL),
            fetch(PROMOCOES_CSV_URL),
            fetch(DELIVERY_FEES_CSV_URL) 
        ]);

        if (!cardapioResponse.ok) {
            throw new Error(`Erro ao buscar o cardápio: ${cardapioResponse.statusText}`);
        }
        if (!promocoesResponse.ok) {
            throw new Error(`Erro ao buscar as promoções: ${promocoesResponse.statusText}`);
        }
        if (!deliveryFeesResponse.ok) { 
            throw new Error(`Erro ao buscar as taxas de entrega: ${deliveryFeesResponse.statusText}`);
        }

        const cardapioData = await cardapioResponse.text();
        const promocoesData = await promocoesResponse.text();
        const deliveryFeesData = await deliveryFeesResponse.text(); 

        res.status(200).json({
            cardapio: cardapioData,
            promocoes: promocoesData,
            deliveryFees: deliveryFeesData 
        });

    } catch (error) {
        console.error('Erro na função Vercel:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao carregar dados.' });
    }
};
