(async function () {
    console.log("🚀 Бот запущен! Мониторинг сделок начался.");

    const TELEGRAM_BOT_TOKEN = "8034311364:AAGZZJVPPjLtA-Ofy3xFTDRW50WS_bAHMsQ";
    const TELEGRAM_CHAT_ID = "7393151782"; // Твой Chat ID
    const CHECK_INTERVAL = 40000; // Проверка каждые 40 секунд
    const STATUS_INTERVAL = 5 * 60 * 1000; // Сообщение о состоянии каждые 5 минут
    const LOG_INTERVAL = 30 * 60 * 1000; // Логи каждые 30 минут
    const BASE_URL = "https://fkwallet.io/personal/p2p/trades?type=sell&page=1";
    let lastDeals = new Set();
    let isFirstRun = true;
    let lastCheckTime = new Date().toLocaleTimeString();
    let logs = [];

    async function sendToTelegram(message) {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        try {
            await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "Markdown" })
            });
        } catch (error) {
            console.error("❌ Ошибка отправки в Telegram:", error);
        }
    }

    function findDeals() {
        const deals = [];
        const rows = document.querySelectorAll("table tbody tr");

        rows.forEach((row, index) => {
            try {
                const columns = row.querySelectorAll("td");
                if (columns.length < 5) return;

                const seller = columns[0]?.innerText.trim() || "❌ Не найдено";
                const price = columns[1]?.innerText.trim() || "❌ Не найдено";
                const discountText = columns[1]?.querySelector("p")?.innerText.trim() || "0%";
                const paymentMethod = columns[2]?.innerText.trim() || "❌ Не найдено";
                const limit = columns[3]?.innerText.trim() || "❌ Не найдено";
                const tradeLink = `${BASE_URL}#trade-${index + 1}`;

                // Исправленная обработка процента
                const discountMatches = discountText.match(/(\d+(\.\d+)?)%/);
                const discount = discountMatches ? parseFloat(discountMatches[1]) : 0;

                if (discount >= 10) {  // Теперь точно >= 10%
                    const dealKey = `${seller}-${price}-${discount}`;
                    if (!lastDeals.has(dealKey)) {
                        lastDeals.add(dealKey);
                        deals.push({ seller, price, discount, paymentMethod, limit, tradeLink });
                    }
                }

                logs.push(`👤 ${seller} | 💲 ${price} | 💸 Доплачивает: ${discount}%`);
            } catch (e) {
                console.error("❌ Ошибка при обработке строки:", e);
            }
        });

        return deals;
    }

    async function checkDeals() {
        lastCheckTime = new Date().toLocaleTimeString();

        if (isFirstRun) {
            await sendToTelegram("🤖 Бот запущен! Мониторинг сделок начался.");
            isFirstRun = false;
        }

        const foundDeals = findDeals();

        if (foundDeals.length > 0) {
            let message = "🔥 Найдены новые сделки!\n";
            foundDeals.forEach(d => {
                message += `\n👤 *Продавец:* ${d.seller}\n💲 *Цена:* ${d.price}\n💸 *Доплачивает:* ${d.discount}%\n💳 *Метод оплаты:* ${d.paymentMethod}\n📉 *Лимит:* ${d.limit}\n🔗 [Открыть сделку](${d.tradeLink})\n`;
                message += "--------------------------";
            });

            await sendToTelegram(message);
        }
    }

    async function sendStatusReport() {
        await sendToTelegram(`📢 Статус бота\n⏰ Последняя проверка: ${lastCheckTime}\n🔄 Мониторинг работает.`);
    }

    async function sendLogs() {
        if (logs.length > 0) {
            const logMessage = `📜 Логи сделок за 30 минут:\n\n` + logs.join("\n");
            await sendToTelegram(logMessage);
            logs = []; // Очищаем логи
        }
    }

    setInterval(checkDeals, CHECK_INTERVAL);
    setInterval(sendStatusReport, STATUS_INTERVAL);
    setInterval(sendLogs, LOG_INTERVAL);
    checkDeals();
})();
