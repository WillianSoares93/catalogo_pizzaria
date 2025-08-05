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
// A constante DELIVERY_FEES_CSV_URL FOI REMOVIDA COMPLETAMENTE.
// NÃO HÁ MAIS NENHUMA REFERÊNCIA À PLANILHA DE FRETES NESTE ARQUIVO.

export default async (req, res) => {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); 

    try {
        console.log('Vercel Function: Iniciando busca de dados...');

        // Busca Cardapio
        console.log('Vercel Function: Buscando Cardápio...');
        const cardapioResponse = await fetch(CARDAPIO_CSV_URL).catch(err => { 
            console.error('Vercel Function: Erro de rede/conexão ao buscar CARDAPIO_CSV_URL:', err.message);
            throw new Error(`Falha na busca do cardápio (rede): ${err.message}`);
        });
        if (!cardapioResponse.ok) {
            const errorText = await cardapioResponse.text(); 
            console.error(`Vercel Function: Cardápio Response NOT OK. Status: ${cardapioResponse.status}, StatusText: ${cardapioResponse.statusText}, Corpo: ${errorText.substring(0, 200)}...`);
            throw new Error(`Erro ao buscar o cardápio: ${cardapioResponse.statusText}`);
        }
        const cardapioData = await cardapioResponse.text();
        console.log('Vercel Function: Cardápio buscado com sucesso.');

        // Busca Promocoes
        console.log('Vercel Function: Buscando Promoções...');
        const promocoesResponse = await fetch(PROMOCOES_CSV_URL).catch(err => {
            console.error('Vercel Function: Erro de rede/conexão ao buscar PROMOCOES_CSV_URL:', err.message);
            throw new Error(`Falha na busca das promoções (rede): ${err.message}`);
        });
        if (!promocoesResponse.ok) {
            const errorText = await promocoesResponse.text();
            console.error(`Vercel Function: Promoções Response NOT OK. Status: ${promocoesResponse.status}, StatusText: ${promocoesResponse.statusText}, Corpo: ${errorText.substring(0, 200)}...`);
            throw new Error(`Erro ao buscar as promoções: ${promocoesResponse.statusText}`);
        }
        const promocoesData = await promocoesResponse.text();
        console.log('Vercel Function: Promoções buscadas com sucesso.');

        // A busca por Taxas de Entrega foi REMOVIDA COMPLETAMENTE deste arquivo.
        // Não há mais nenhuma referência a DELIVERY_FEES_CSV_URL ou a uma chamada fetch para ela aqui.

        console.log('Vercel Function: Todos os dados (cardápio e promoções) buscados com sucesso. Enviando resposta.');

        res.status(200).json({
            cardapio: cardapioData,
            promocoes: promocoesData
            // deliveryFees NÃO é mais enviado.
        });

    } catch (error) {
        console.error('Vercel Function: Erro capturado no bloco try-catch:', error.message);
        res.status(500).json({ error: `Erro interno no servidor ao carregar dados: ${error.message}` });
    }
};
