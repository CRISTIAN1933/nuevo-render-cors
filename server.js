import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import { URL } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get("/proxy", async (req, res) => {
    try {
        const target = req.query.url;
        if (!target) {
            return res.status(400).send("Missing url param");
        }

        const decodedUrl = decodeURIComponent(target);
        const urlObj = new URL(decodedUrl);

        const response = await fetch(decodedUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
                "Accept": "*/*",
                "Origin": urlObj.origin,
                "Referer": urlObj.origin + "/"
            }
        });

        const contentType = response.headers.get("content-type") || "";
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", contentType);

        // ============================
        // SI ES PLAYLIST M3U8
        // ============================
        if (contentType.includes("application/vnd.apple.mpegurl") || decodedUrl.endsWith(".m3u8")) {
            let text = await response.text();
            const base = decodedUrl.substring(0, decodedUrl.lastIndexOf("/") + 1);

            // Convertir paths relativos en absolutos usando el proxy
            text = text.replace(
                /^(?!https?:\/\/)(.*)$/gm,
                line => {
                    if (line.startsWith("#")) return line;
                    return `/proxy?url=${encodeURIComponent(base + line)}`;
                }
            );

            return res.send(text);
        }

        // ============================
        // SEGMENTOS BINARIOS (.ts, .m4s, etc)
        // ============================
        const buffer = await response.arrayBuffer();
        return res.send(Buffer.from(buffer));

    } catch (err) {
        console.error("Proxy error:", err);
        res.status(500).send("Proxy error");
    }
});

app.listen(PORT, () => {
    console.log("HLS Proxy running on port", PORT);
});