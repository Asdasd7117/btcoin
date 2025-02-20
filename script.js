let previousPrices = {};
let storedSymbols = JSON.parse(localStorage.getItem("storedSymbols")) || {};

async function getAllSymbols() {
    try {
        let response = await fetch("https://api.binance.com/api/v3/ticker/24hr");
        if (!response.ok) throw new Error("فشل في جلب بيانات الرموز.");
        let data = await response.json();
        return data.map(ticker => ticker.symbol).filter(symbol => symbol.endsWith("USDT"));
    } catch (error) {
        showError("خطأ في جلب جميع العملات: " + error.message);
        return [];
    }
}

async function fetchMarketData(symbols) {
    try {
        let responses = await Promise.all(symbols.map(symbol => 
            fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`)
            .then(res => res.ok ? res.json() : Promise.reject("فشل في جلب البيانات."))
        ));
        return responses;
    } catch (error) {
        showError("خطأ في جلب بيانات السوق: " + error);
        return [];
    }
}

async function checkMarketRecovery() {
    let symbols = await getAllSymbols();
    if (symbols.length === 0) return;
    
    let marketData = await fetchMarketData(symbols);
    let alertContainer = document.getElementById("alertContainer");
    alertContainer.innerHTML = "";
    
    marketData.forEach(data => {
        let symbol = data.symbol;
        let lastPrice = parseFloat(data.lastPrice);
        let priceChange = parseFloat(data.priceChangePercent);
        let volume = parseFloat(data.quoteVolume);
        
        if (!previousPrices[symbol]) {
            previousPrices[symbol] = lastPrice;
            return;
        }

        let previousPrice = previousPrices[symbol];
        let priceTrend = lastPrice > previousPrice && priceChange > 0.5; // تأكيد الارتفاع الحقيقي
        previousPrices[symbol] = lastPrice;

        if (priceTrend && !storedSymbols[symbol]) {
            let timestamp = Date.now();
            storedSymbols[symbol] = timestamp;
            localStorage.setItem("storedSymbols", JSON.stringify(storedSymbols));
        }
    });
    
    updateDisplayedAlerts();
    setTimeout(checkMarketRecovery, 60000); // استخدام setTimeout بدلاً من setInterval لتقليل الضغط على API
}

function updateDisplayedAlerts() {
    let now = Date.now();
    let alertContainer = document.getElementById("alertContainer");
    alertContainer.innerHTML = "";
    
    Object.keys(storedSymbols).forEach(symbol => {
        let startTime = storedSymbols[symbol];
        let elapsedTime = now - startTime;
        if (elapsedTime > 43200000) { // 12 ساعة = 43200000 ميلي ثانية
            delete storedSymbols[symbol];
            localStorage.setItem("storedSymbols", JSON.stringify(storedSymbols));
        } else {
            let timeAgo = formatTimeAgo(elapsedTime);
            showAlert(`${symbol} 🚀 بدأت في الصعود منذ ${timeAgo}`);
        }
    });
}

function showAlert(message) {
    let alertContainer = document.getElementById("alertContainer");
    let alertBox = document.createElement("div");
    alertBox.className = "alertBox";
    alertBox.innerHTML = `${message} <button onclick='this.parentElement.remove()'>×</button>`;
    alertBox.style.animation = "fadeIn 0.5s ease-in-out";
    alertContainer.appendChild(alertBox);
}

function showError(message) {
    let errorContainer = document.getElementById("errorContainer");
    errorContainer.innerHTML = message;
    setTimeout(() => errorContainer.innerHTML = "", 5000);
}

function formatTimeAgo(milliseconds) {
    let minutes = Math.floor(milliseconds / 60000);
    if (minutes < 1) return "ثوانٍ قليلة";
    if (minutes < 60) return `${minutes} دقيقة`;
    let hours = Math.floor(minutes / 60);
    return `${hours} ساعة و ${minutes % 60} دقيقة`;
}

checkMarketRecovery();
