// ==============================================
// exmxc-crawl-lite — Railway / Node 18 SAFE VERSION
// ==============================================

import express from "express";

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
    // ----------------------------------------------
    // CRITICAL: runtime imports in correct order
    // ----------------------------------------------
    const undici = await import("undici");
    if (!globalThis.File) {
      globalThis.File = undici.File;
    }

    const cheerio = await import("cheerio");
    const fetch = undici.fetch;

    // ----------------------------------------------
    // Fetch HTML (NO axios)
    // ----------------------------------------------
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; exmxc-crawl-lite/1.0; +https://exmxc.ai)",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    if (!resp.ok) {
      throw new Error(`Fetch failed with status ${resp.status}`);
    }

    const html = await resp.text();
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
      schemaObjects
    });

  } catch (err) {
    console.error("crawl-lite error:", err);

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
// Start server (Railway-compliant)
// ==============================================
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`exmxc-crawl-lite listening on ${PORT}`);
});
