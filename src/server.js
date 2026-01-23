import express from "express";
import helmet from "helmet";
import urlFetcher from "./fetcher.js";
import modifyHTML from "./modifier.js";

const myServer = express();
const PORT = process.env.PORT || 3000;
const targetUrl = "https://wikipedia.org";

myServer.use(helmet());

myServer.use(express.static("public"));

async function retryAsync(fn, retries = 1, delay = 80) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  throw lastError;
}

myServer.get("/", async (req, res) => {
  const baseUrl = req.query.targetUrl || targetUrl;
  try {
    const urlObjWhitelist = new URL(baseUrl);
    if (!urlObjWhitelist.hostname.endsWith("wikipedia.org")) {
      return res.status(403).send("Forbidden");
    }
  } catch (err) {
    return res.status(400).send("Error: Invalid URL format.");
  }
  const { targetUrl: _, ...otherParams } = req.query;

  const searchParams = new URLSearchParams(otherParams);
  const fullUrl = searchParams.toString()
    ? `${baseUrl}?${searchParams.toString()}`
    : baseUrl;

  let result;
  try {
    result = await retryAsync(() => urlFetcher(fullUrl));
    res.setHeader("Content-Type", result.dataType);

    const html = Buffer.from(result.siteData).toString();
    const modifiedHTML = modifyHTML(html, result.absoluteUrl);
    res.send(modifiedHTML);
  } catch (err) {
    res
      .status(502)
      .send(
        "<h1>Failed to load the page. Please try again later or refresh the page.</h1>",
      );
  }
});

myServer.get("/resource", async (req, res) => {
  const targetParam = req.query.targetUrl;
  if (!targetParam) {
    return res.status(400).send("Error: No targetUrl provided.");
  }

  try {
    const result = await retryAsync(() => urlFetcher(targetParam));
    res.setHeader("Content-Type", result.dataType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.end(Buffer.from(result.siteData));
  } catch (err) {
    res
      .status(502)
      .send(
        "<h1>Failed to load the resource after several attempts. Please refresh the page or try again later.</h1>",
      );
  }
});

myServer.listen(PORT);
