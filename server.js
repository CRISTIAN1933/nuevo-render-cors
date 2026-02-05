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
            return res.status(400).send("Missing url");
        }

        const decodedUrl = decodeURIComponent(target);
        const urlObj = new URL(decodedUrl);

        const headers = {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
            "Accept": "*/*",
            "Accept-Encoding": "identity",
            "Connection": "keep-alive",
            "Referer": urlObj.origin + "/",
            "Origin": urlObj.origin,
            "Host": urlObj.host,
            "Range": req.headers.range || "bytes=0-"
        };

        const response = await fetch(decodedUrl, {
            method: "GET",
            headers
        });

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "*");

        const contentType = response.headers.get("content-type");
        if (contentType) {
            res.setHeader("Content-Type", contentType);
        }

        // ===============================
        // M3U8
        // ===============================
        if (
            decodedUrl.endsWith(".m3u8") ||
            contentType?.includes("mpegurl")
        ) {
            let body = await response.text();
            const baseUrl =
                decodedUrl.substring(0, decodedUrl.lastIndexOf("/") + 1);

            body = body.replace(
                /^(?!https?:\/\/)(.*)$/gm,
                line => {
                    if (line.startsWith("#")) return line;
                    return `/proxy?url=${encodeURIComponent(baseUrl + line)}`;
                }
            );

            return res.send(body);
        }

        // ===============================
        // TS / M4S / AAC
        // ===============================
        const buffer = await response.arrayBuffer();
        return res.send(Buffer.from(buffer));

    } catch (err) {
        console.error("Proxy error:", err);
        res.status(500).send("Proxy error");
    }
});

app.listen(PORT, () => {
    console.log("HLS proxy running on", PORT);
});