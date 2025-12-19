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
// Root endpoint (Railway edge requires this)
// ==============================================
app.get("/", (_req, res) => {
  res.json({
    service: "exmxc-crawl-lite",
    status: "ok",
    endpoints: ["/health", "/crawl-lite"]
  });
});

// ==============================================
// Health check
// ==============================================
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "exmxc-crawl-lite"
  });
});

// ==============================================
// Crawl-Lite Endpoint (single page only)
// ==============================================
app.post("/crawl-lite", async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      success: false,
      error: "Missing or invalid URL"
    });
  }

  try {
    const resp = await axios.get(url, {
      timeout: 15000,
      maxContentLength: 2_000_000, // hard guard
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

    // ----------------------------------------------
    // Extract signals
    // ----------------------------------------------
    const title = $("title").first().text().trim() || "";
    const description =
      $('meta[name="description"]').attr("content") || "";

    const canonical =
      $('link[rel="canonical"]').attr("href") || url;

    // ----------------------------------------------
    // Extract JSON-LD
    // ----------------------------------------------
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
      schemaCount: schemaObjects.length,
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
// Start server (Railway-safe)
// ==============================================
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`exmxc-crawl-lite listening on ${PORT}`);
});
