async function urlFetcher(targetUrl) {
  try {
    const response = await fetch(targetUrl);
    const contentType = response.headers.get("content-type");
    const data = await response.arrayBuffer();
    return { siteData: data, dataType: contentType, absoluteUrl: response.url };
  } catch (err) {
    console.error(`Failed to fetch: ${targetUrl}`);
    console.error(`Error cause:`, err.cause);
    throw err;
  }
}
export default urlFetcher;
