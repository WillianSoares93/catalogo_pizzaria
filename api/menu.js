// Para usar 'import' em vez de 'require' em Serverless Functions do Vercel,
// você precisa garantir que o ambiente Node.js trate este arquivo como um módulo ES.
// A forma mais comum de fazer isso é adicionando "type": "module" no seu package.json
// ou renomeando o arquivo para .mjs.
// No Vercel, a forma mais simples é garantir que o package.json esteja configurado corretamente.

import fetch from 'node-fetch';

// ATENÇÃO: Substitua estas URLs pelas URLs CSV DAS SUAS PLANILHAS PUBLICADAS.
// Verifique se as URLs estão corretas e se as planilhas estão configuradas como "Qualquer pessoa com o link pode ver".
const CARDAPIO_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=664943668&single=true&output=csv'; 
const PROMOCOES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=600393470&single=true&output=csv'; 
const DELIVERY_FEES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=1843654910&single=true&output=csv'; 

export default async (req, res) => {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); 

    try {
        console.log('Vercel Function: Iniciando busca de dados...');

        const [cardapioResponse, promocoesResponse, deliveryFeesResponse] = await Promise.all([
            fetch(CARDAPIO_CSV_URL).catch(err => { 
                console.error('Vercel Function: Erro ao buscar CARDAPIO_CSV_URL:', err.message);
                throw new Error(`Falha na busca do cardápio: ${err.message}`);
            }),
            fetch(PROMOCOES_CSV_URL).catch(err => {
                console.error('Vercel Function: Erro ao buscar PROMOCOES_CSV_URL:', err.message);
                throw new Error(`Falha na busca das promoções: ${err.message}`);
            }),
            fetch(DELIVERY_FEES_CSV_URL).catch(err => {
                console.error('Vercel Function: Erro ao buscar DELIVERY_FEES_CSV_URL:', err.message);
                throw new Error(`Falha na busca das taxas de entrega: ${err.message}`);
            })
        ]);

        if (!cardapioResponse.ok) {
            console.error(`Vercel Function: Cardápio Response NOT OK: ${cardapioResponse.status} ${cardapioResponse.statusText}`);
            throw new Error(`Erro ao buscar o cardápio: ${cardapioResponse.statusText}`);
        }
        if (!promocoesResponse.ok) {
            console.error(`Vercel Function: Promoções Response NOT OK: ${promocoesResponse.status} ${promocoesResponse.statusText}`);
            throw new Error(`Erro ao buscar as promoções: ${promocoesResponse.statusText}`);
        }
        if (!deliveryFeesResponse.ok) { 
            console.error(`Vercel Function: Taxas de Entrega Response NOT OK: ${deliveryFeesResponse.status} ${deliveryFeesResponse.statusText}`);
            throw new Error(`Erro ao buscar as taxas de entrega: ${deliveryFeesResponse.statusText}`);
        }

        const cardapioData = await cardapioResponse.text();
        const promocoesData = await promocoesResponse.text();
        const deliveryFeesData = await deliveryFeesResponse.text(); 

        console.log('Vercel Function: Dados buscados com sucesso. Enviando resposta.');

        res.status(200).json({
            cardapio: cardapioData,
            promocoes: promocoesData,
            deliveryFees: deliveryFeesData 
        });

    } catch (error) {
        console.error('Vercel Function: Erro capturado no bloco try-catch:', error.message);
        res.status(500).json({ error: `Erro interno no servidor ao carregar dados: ${error.message}` });
    }
};
