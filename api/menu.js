
export default async function handler(req, res) {
    const CARDAPIO_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=0&single=true&output=csv";
    const PROMOCOES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=2119939811&single=true&output=csv";
    const DELIVERY_FEES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=303326494&single=true&output=csv";
    const INGREDIENTES_HAMBURGUER_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJeo2AAETdXC08x9EQlkIG1FiVLEosMng4IvaQYJAdZnIDHJw8CT8J5RAJNtJ5GWHOKHkUsd5V8OSL/pub?gid=1816106560&single=true&output=csv";

    function csvParaJson(csv) {
        const linhas = csv.split("\n");
        const cabecalho = linhas[0].split(",").map(h => h.trim());
        const dados = linhas.slice(1).filter(l => l.trim() !== "").map(linha => {
            const valores = linha.split(",").map(v => v.trim());
            const obj = {};
            cabecalho.forEach((col, i) => {
                obj[col] = valores[i] || "";
            });
            return obj;
        });
        return dados;
    }

    try {
        const [cardapioRes, promocoesRes, deliveryRes, ingredientesRes] = await Promise.all([
            fetch(CARDAPIO_CSV_URL),
            fetch(PROMOCOES_CSV_URL),
            fetch(DELIVERY_FEES_CSV_URL),
            fetch(INGREDIENTES_HAMBURGUER_CSV_URL)
        ]);

        const [cardapioCSV, promocoesCSV, deliveryCSV, ingredientesCSV] = await Promise.all([
            cardapioRes.text(),
            promocoesRes.text(),
            deliveryRes.text(),
            ingredientesRes.text()
        ]);

        const cardapio = csvParaJson(cardapioCSV);
        const promocoes = csvParaJson(promocoesCSV);
        const deliveryFees = csvParaJson(deliveryCSV);
        const ingredientesRaw = csvParaJson(ingredientesCSV);

        const ingredientesHamburguer = ingredientesRaw.map(ing => ({
            nome: ing["Ingredientes"],
            preco: parseFloat(ing["valor"].replace(",", ".")) || 0
        }));

        // Injeta ingredientes no produto "Hambúrguer Montável"
        cardapio.forEach(item => {
            if ((item["Nome do Item"] || "").toLowerCase().includes("hambúrguer montável")) {
                item.ingredientes = ingredientesHamburguer;
            }
        });

        res.status(200).json({ cardapio, promocoes, deliveryFees, ingredientesHamburguer });

    } catch (error) {
        console.error("Erro na API:", error);
        res.status(500).json({ error: "Erro ao carregar dados." });
    }
}
