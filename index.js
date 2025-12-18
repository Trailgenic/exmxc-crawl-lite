import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
app.use(express.json());

app.post("/crawl-lite", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: "Missing URL" });
  }

  try {
    const resp = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; exmxc-crawl-lite/1.0; +https://exmxc.ai)"
      }
    });

    const html = resp.data;
    const $ = cheerio.load(html);

    const title = $("title").first().text().trim();
    const description =
      $('meta[name="description"]').attr("content") || "";

    const canonical =
      $('link[rel="canonical"]').attr("href") || url;

    const schemaObjects = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        schemaObjects.push(JSON.parse($(el).text()));
      } catch {}
    });

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

app.get("/health", (_, res) => {
  res.json({ ok: true, service: "exmxc-crawl-lite" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`exmxc-crawl-lite listening on ${port}`);
});
