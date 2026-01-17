import express from "express";
import helmet from "helmet";
import urlFetcher from "./fetcher.js";
import modifyHTML from "./modifier.js";

const myServer = express();
const PORT = process.env.PORT || 3000;
const targetUrl = "https:wikipedia.org";

myServer.use(helmet());

myServer.use(express.static("public"));

async function retryAsync(fn, retries = 2, delay = 800) {
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
  if (!baseUrl.includes("wikipedia.org")) {
    return res
      .status(403)
      .send("Forbidden: This proxy only supports Wikipedia.");
  }
  const { targetUrl: _, ...otherParams } = req.query;

  const searchParams = new URLSearchParams(otherParams);
  const fullUrl = searchParams.toString()
    ? `${baseUrl}?${searchParams.toString()}`
    : baseUrl;

  let result;
  try {
    result = await retryAsync(() => urlFetcher(fullUrl), 2, 800);
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

  try {
    const result = await retryAsync(() => urlFetcher(targetParam), 2, 800);
    res.setHeader("Content-Type", result.dataType);
    res.send(Buffer.from(result.siteData));
  } catch (err) {
    res
      .status(502)
      .send(
        "<h1>Failed to load the resource after several attempts. Please refresh the page or try again later.</h1>",
      );
  }
});

myServer.listen(PORT);
