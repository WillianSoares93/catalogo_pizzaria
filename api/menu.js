import fetch from 'node-fetch';

// ATENÇÃO: Substitua esta URL pela URL CSV DA SUA PLANILHA DE CARDÁPIO PUBLICADA.
// Exemplo: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=664943668&single=true&output=csv'
const CARDAPIO_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=664943668&single=true&output=csv'; 
const PROMOCOES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=600393470&single=true&output=csv';

export default async (req, res) => {
    // Define o cabeçalho Cache-Control para 5 minutos (300 segundos)
    // 's-maxage=300' instrui a CDN do Vercel a armazenar em cache por 300 segundos.
    // 'stale-while-revalidate' permite que a CDN sirva o cache antigo enquanto busca uma nova versão em segundo plano.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); 

    try {
        // Busca os dados do cardápio
        const cardapioResponse = await fetch(CARDAPIO_CSV_URL);
        if (!cardapioResponse.ok) {
            throw new Error(`Erro ao buscar o cardápio: ${cardapioResponse.statusText}`);
        }
        const cardapioData = await cardapioResponse.text();

        // Busca os dados das promoções
        const promocoesResponse = await fetch(PROMOCOES_CSV_URL);
        if (!promocoesResponse.ok) {
            throw new Error(`Erro ao buscar as promoções: ${promocoesResponse.statusText}`);
        }
        const promocoesData = await promocoesResponse.text();
        
        // Retorna ambos os dados como um objeto JSON.
        // Seu frontend precisará parsear este JSON e então os CSVs internos.
        res.status(200).json({
            cardapio: cardapioData,
            promocoes: promocoesData
        });

    } catch (error) {
        console.error('Erro na função Vercel:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao carregar dados.' });
    }
};
