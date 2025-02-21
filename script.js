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
        let thresholdVolume = volume > 100000000 ? 5000000 : 1000000;
        let now = Date.now();
        let savedTime = localStorage.getItem(symbol);

        if (priceChange < thresholdChange && volume > thresholdVolume) {
            if (!savedTime) {
                localStorage.setItem(symbol, now);
            }
            showAlert(symbol, `🔥 ${symbol} انخفاض ${priceChange}% وتجميع الحيتان!`);
        } else if (savedTime && now - savedTime < 86400000) {
            showAlert(symbol, `⚠️ انتباه! الحيتان تتراجع من ${symbol}`);
        }
    });
    
    updateAlertTimes();
    removeExpiredAlerts(symbols);
}

function showAlert(symbol, message) {
    let alertContainer = document.getElementById("alertContainer");
    let alertBox = document.createElement("div");
    alertBox.className = "alertBox";
    alertBox.setAttribute("data-symbol", symbol);
    alertBox.innerHTML = `${message} <span class='time-elapsed'></span> <button onclick='this.parentElement.remove()'>×</button>`;
    alertContainer.appendChild(alertBox);
}

function showError(message) {
    let errorContainer = document.getElementById("errorContainer");
    errorContainer.innerHTML = message;
    setTimeout(() => errorContainer.innerHTML = "", 5000);
}

function updateAlertTimes() {
    let now = Date.now();
    document.querySelectorAll(".alertBox").forEach(alertBox => {
        let symbol = alertBox.getAttribute("data-symbol");
        let savedTime = localStorage.getItem(symbol);
        if (savedTime) {
            let elapsed = Math.floor((now - savedTime) / 60000);
            let timeText = elapsed < 60 ? `${elapsed} دقيقة` : `${Math.floor(elapsed / 60)} ساعة`;
            if (elapsed >= 1440) timeText = "24 ساعة";
            alertBox.querySelector(".time-elapsed").textContent = ` منذ ${timeText}`;
        }
    });
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
                if (alertBox.getAttribute("data-symbol") === symbol) {
                    alertBox.remove();
                }
            });
        }
    });
}

checkWhaleActivity();
setInterval(checkWhaleActivity, 60000);
setInterval(updateAlertTimes, 60000);
