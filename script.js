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

async function checkWhaleActivity() {
    let symbols = await getAllSymbols();
    if (symbols.length === 0) return;
    
    let marketData = await fetchMarketData(symbols);
    let alertContainer = document.getElementById("alertContainer");
    alertContainer.innerHTML = ""; 
    
    marketData.forEach(data => {
        let symbol = data.symbol;
        let priceChange = parseFloat(data.priceChangePercent);
        let volume = parseFloat(data.quoteVolume);

        let thresholdChange = -3;
        let thresholdVolume = volume > 100000000 ? 5000000 : 1000000; // 5 مليون للعملات الكبيرة، 1 مليون للصغيرة

        if (priceChange < thresholdChange && volume > thresholdVolume) {
            showAlert(`${symbol} 🔥 انخفاض ${priceChange}% وتجميع الحيتان!`);
            localStorage.setItem(symbol, Date.now());
        }
    });
    
    removeExpiredAlerts(symbols);
}

function showAlert(message) {
    let alertContainer = document.getElementById("alertContainer");
    let alertBox = document.createElement("div");
    alertBox.className = "alertBox";
    alertBox.innerHTML = `${message} <button onclick='this.parentElement.remove()'>×</button>`;
    alertContainer.appendChild(alertBox);
}

function showError(message) {
    let errorContainer = document.getElementById("errorContainer");
    errorContainer.innerHTML = message;
    setTimeout(() => errorContainer.innerHTML = "", 5000);
}

function removeExpiredAlerts(symbols) {
    let now = Date.now();
    let alertContainer = document.getElementById("alertContainer");
    
    symbols.forEach(symbol => {
        let savedTime = localStorage.getItem(symbol);
        if (savedTime && (now - savedTime > 86400000)) {
            localStorage.removeItem(symbol);
            let alertBoxes = [...alertContainer.getElementsByClassName("alertBox")];
            alertBoxes.forEach(alertBox => {
                if (alertBox.innerHTML.includes(symbol)) {
                    alertBox.remove();
                }
            });
        }
    });
}

checkWhaleActivity();
setInterval(checkWhaleActivity, 60000);
