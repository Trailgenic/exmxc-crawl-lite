// ==============================================
// Node 18 / Railway / Undici global fix
// MUST run before cheerio is loaded
// ==============================================
import { File } from "undici";
globalThis.File = File;

// ==============================================
// Core imports
// ==============================================
import express from "express";
import axios from "axios";

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
    // ⚠️ Dynamically import cheerio AFTER patch
    const cheerio = await import("cheerio");

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
    // Extract signals
    // ==============================================
    const title = $("title").first().text().trim() || "";
    const description =
      $('meta[name="description"]').attr("content") || "";

    const canonical =
      $('link[rel="canonical"]').attr("href") || url;

    // ==============================================
    // Extract JSON-LD
    // ==============================================
    const schemaObjects = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        schemaObjects.push(JSON.parse($(el).text()));
      } catch {
        // ignore malformed schema
      }
    });

    res.json({
      success: true,
      mode: "crawl-lite",
      url,
      title,
      description,
      canonical,
      schemaObjects
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
