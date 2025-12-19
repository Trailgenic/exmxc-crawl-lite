// ==============================================
// Node 18 / undici compatibility fix
// Railway + axios requires global File
// ==============================================
import { File } from "undici";
global.File = File;

// ==============================================
// Core imports
// ==============================================
import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

// ==============================================
// App setup
// ==============================================
const app = express();
app.use(express.json({ limit: "1mb" }));

// ==============================================
// Crawl-Lite Endpoint
// ==============================================
app.post("/crawl-lite", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "Missing URL"
    });
  }

  try {
    const resp = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; exmxc-crawl-lite/1.0; +https://exmxc.ai)",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    const html = resp.data;
    const $ = cheerio.load(html);

    // ==============================================
    // Extract core signals
    // ==============================================
    const title = $("title").first().text().trim() || "";
    const description =
      $('meta[name="description"]').attr("content") || "";

    const canonical =
      $('link[rel="canonical"]').attr("href") || url;

    // ==============================================
    // Extract JSON-LD schemas
    // ==============================================
    const schemaObjects = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).text());
        schemaObjects.push(parsed);
      } catch {
        // ignore malformed schema blocks
      }
    });

    // ==============================================
    // Response
    // ==============================================
    res.json({
      success: true,
      mode: "crawl-lite",
      url,
      title,
      description,
      canonical,
      schemaObjects,
      html
    });

  } catch (err) {
    res.status(502).json({
      success: false,
      error: "crawl-lite failed",
      details: err.message
    });
  }
});

// ==============================================
// Health check
// ==============================================
app.get("/health", (_, res) => {
  res.json({
    ok: true,
    service: "exmxc-crawl-lite"
  });
});

// ==============================================
// Start server
// ==============================================
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`exmxc-crawl-lite listening on ${port}`);
});
