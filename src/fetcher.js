async function urlFetcher(targetUrl) {
  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "WikiSpace/1.0 (This is an Educational Cheerio Proxy Project; https://github.com/samir-magdy/wikipedia-web-proxy)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.wikipedia.org/",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    const data = await response.arrayBuffer();
    return { siteData: data, dataType: contentType, absoluteUrl: response.url };
  } catch (err) {
    throw err;
  }
}

export default urlFetcher;
