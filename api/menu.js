// Este arquivo é uma função Serverless para o Vercel.
// Ele é responsável por buscar os dados do cardápio, promoções, taxas de entrega
// e agora os ingredientes de hambúrguer e informações de contato de planilhas Google Sheets publicadas como CSV e retorná-los para a aplicação front-end.
//
// Para garantir que o Node.js no ambiente Vercel trate este arquivo como um módulo ES (permitindo 'import'),
// você deve ter "type": "module" no seu arquivo package.json.

import fetch from 'node-fetch'; // Importa a biblioteca 'node-fetch' para fazer requisições HTTP

// URLs das suas planilhas Google Sheets publicadas como CSV.
// É CRÍTICO que estas URLs estejam corretas e que as planilhas estejam configuradas
// para serem "Visíveis para qualquer pessoa com o link".
const CARDAPIO_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=664943668&single=true&output=csv';
const PROMOCOES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=600393470&single=true&output=csv';
const DELIVERY_FEES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=1695668250&single=true&output=csv';
const INGREDIENTES_HAMBURGUER_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=1816106560&single=true&output=csv';
const CONTACT_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=2043568216&single=true&output=csv';

// Função auxiliar para parsear os dados do CSV
function parseCsvData(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    function parseCsvLine(line) {
        const values = [];
        let inQuote = false;
        let currentField = '';
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuote && i + 1 < line.length && line[i + 1] === '"') {
                    currentField += '"';
                    i++;
                } else {
                    inQuote = !inQuote;
                }
            } else if (char === ',' && !inQuote) {
                values.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }
        values.push(currentField);
        return values.map(v => (v || '').replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    }

    const headersRaw = parseCsvLine(lines[0]);
    
    // Mapeamento de cabeçalhos mais robusto para evitar erros com pequenas variações nos nomes das colunas.
    const mappedHeaders = headersRaw.map(header => {
        let cleanedHeader = header.trim();
        switch (cleanedHeader) {
            case 'ID Item (único)':
            case 'ID Item':
            case 'ID Intem': // Mantido por segurança
            case 'ID Promocao':
                return 'id';
            
            case 'Nome do Item':
            case 'Ingredientes':
            case 'Nome da Promocao':
                return 'name';

            case 'Descrição': return 'description';
            case 'Preço 8 fatias': return 'basePrice';
            case 'Preço 6 fatias': return 'price6Slices';
            case 'Preço 4 fatias': return 'price4Slices';
            case 'Categoria': return 'category';
            case 'É Pizza? (SIM/NÃO)': return 'isPizza';
            case 'É Montável? (SIM/NÃO)': return 'isCustomizable'; 
            case 'Disponível (SIM/NÃO)': return 'available';
            case 'Disponível': return 'available';
            case 'Imagem': return 'imageUrl';
            case 'Preco Promocional': return 'promoPrice';
            case 'ID Item Aplicavel': return 'itemId';
            case 'Ativo (SIM/NAO)': return 'active';
            case 'Bairros': return 'neighborhood';
            case 'Valor Frete': return 'deliveryFee';
            case 'Preço': return 'price';
            case 'Seleção Única': return 'isSingleChoice';
            case 'Limite': return 'limit';
            case 'É Obrigatório?(SIM/NÃO)': return 'isRequired';
            case 'Quantidade Maxima': return 'maxQuantity';
            case 'Dados': return 'data';
            case 'Valor': return 'value';
            default:
                return cleanedHeader.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        }
    });

    const parsedData = [];
    for (let i = 1; i < lines.length; i++) {
        const rowValues = parseCsvLine(lines[i]);
        if (rowValues.length === mappedHeaders.length) {
            let item = {};
            for (let j = 0; j < mappedHeaders.length; j++) {
                let headerKey = mappedHeaders[j];
                let value = rowValues[j];

                if (['basePrice', 'price6Slices', 'price4Slices', 'promoPrice', 'deliveryFee', 'price'].includes(headerKey)) {
                    const parsedValue = parseFloat(String(value).replace(',', '.'));
                    item[headerKey] = isNaN(parsedValue) ? 0 : parsedValue;
                } else if (headerKey === 'limit') {
                    const parsedValue = parseInt(value, 10);
                    item[headerKey] = isNaN(parsedValue) ? Infinity : parsedValue;
                } else if (headerKey === 'maxQuantity') {
                    const parsedValue = parseInt(value, 10);
                    item[headerKey] = isNaN(parsedValue) || parsedValue < 1 ? 1 : parsedValue;
                } else if (['isPizza', 'available', 'active', 'isCustomizable', 'isSingleChoice', 'isRequired'].includes(headerKey)) {
                    item[headerKey] = (value || '').toUpperCase().startsWith('SIM');
                } else {
                    item[headerKey] = value;
                }
            }
            if (item.id && item.name) {
                parsedData.push(item);
            }
        }
    }
    return parsedData;
}

export default async (req, res) => {
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');

    try {
        const fetchData = async (url, name) => {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Falha ao buscar ${name}: ${response.statusText}`);
            }
            return response.text();
        };

        const [
            cardapioCsv,
            promocoesCsv,
            deliveryFeesCsv,
            ingredientesHamburguerCsv,
            contactCsv
        ] = await Promise.all([
            fetchData(CARDAPIO_CSV_URL, 'Cardápio'),
            fetchData(PROMOCOES_CSV_URL, 'Promoções'),
            fetchData(DELIVERY_FEES_CSV_URL, 'Taxas de Entrega'),
            fetchData(INGREDIENTES_HAMBURGUER_CSV_URL, 'Ingredientes de Hambúrguer'),
            fetchData(CONTACT_CSV_URL, 'Informações de Contato')
        ]);
        
        const cardapioData = parseCsvData(cardapioCsv);
        const promocoesData = parseCsvData(promocoesCsv);
        const deliveryFeesData = parseCsvData(deliveryFeesCsv);
        const ingredientesHamburguerData = parseCsvData(ingredientesHamburguerCsv);
        const contactData = parseCsvData(contactCsv);

        res.status(200).json({
            cardapio: cardapioData,
            promocoes: promocoesData,
            deliveryFees: deliveryFeesData,
            ingredientesHamburguer: ingredientesHamburguerData,
            contact: contactData
        });

    } catch (error) {
        console.error('Erro na função serverless:', error);
        res.status(500).json({ error: `Erro interno no servidor: ${error.message}` });
    }
};
