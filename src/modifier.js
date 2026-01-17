import { load } from "cheerio";

const URI_SCHEMES = ["javascript:", "mailto:", "tel:", "data:", "#"];

function resolveUrl(baseUrl, relativeUrl) {
  if (!relativeUrl) {
    return "";
  }

  for (let uriScheme of URI_SCHEMES) {
    if (relativeUrl.startsWith(uriScheme)) {
      return relativeUrl;
    }
  }

  if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
    return relativeUrl;
  }

  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch (err) {
    console.error(`URL resolution error: ${relativeUrl}`, err.message);
    return relativeUrl;
  }
}

function handleForms($, baseUrl) {
  $("form").each((index, form) => {
    const originalAction = $(form).attr("action");

    if (originalAction) {
      const absoluteAction = resolveUrl(baseUrl, originalAction);
      $(form).attr("action", "/");
      $(form).prepend(
        `<input type="hidden" name="targetUrl" value="${absoluteAction}">`,
      );
    }
  });
}

function modifyHTML(html, targetUrl) {
  const $ = load(html);

  $("title").text("WikiSpace");

  handleForms($, targetUrl);

  $("img, a, link, video, source").each((index, element) => {
    const tagName = element.tagName.toLowerCase();
    let attribute;
    let route;

    if (tagName === "img") {
      attribute = "src";
      route = "/resource";
    } else if (tagName === "link") {
      attribute = "href";
      route = "/resource";
    } else if (tagName === "video") {
      attribute = "poster";
      route = "/resource";
    } else if (tagName === "source") {
      attribute = "src";
      route = "/resource";
    } else if (tagName === "a") {
      attribute = "href";
      route = "/";

      const original = $(element).attr(attribute);
      if (!original) return;

      const modifiedUrl = resolveUrl(targetUrl, original);

      try {
        const baseHost = new URL(targetUrl).hostname;
        const linkHost = new URL(modifiedUrl).hostname;
        if (baseHost !== linkHost) {
          $(element).attr(attribute, modifiedUrl);
          return;
        }
      } catch (e) {}

      if (
        modifiedUrl.includes("/wiki/Portal:") ||
        modifiedUrl.includes("Contents/Portals") ||
        modifiedUrl.includes("/wiki/Wikipedia:Contents/")
      ) {
        $(element).attr(attribute, modifiedUrl);
        return;
      }
    }

    const original = $(element).attr(attribute);
    if (!original) return;

    const modifiedUrl = resolveUrl(targetUrl, original);

    const proxiedUrl = `${route}?targetUrl=${encodeURIComponent(modifiedUrl)}`;
    $(element).attr(attribute, proxiedUrl);
  });

  $("head").prepend('<link rel="stylesheet" href="/wikispace.css">');
  $("h1.central-textlogo-wrapper").replaceWith(
    `<div id="pageTitle">
      <h1>WikiSpace</h1>
      <p style="font-size: 2rem;">A clutter free Wikipedia</p>
    </div>`,
  );

  $("nav, div#p-lang-btn").css({ visibility: "hidden" });

  $("input#searchInput").attr("placeholder", "Search WikiSpace");
  $("button.pure-button").text("Search");

  $("header.vector-header").removeClass("mw-header");
  $("form").removeClass("cdx-search-input--has-end-button");
  $("div.collapsible-list").removeClass();
  $("div.sidebar-list-content").removeClass("mw-collapsible-content");
  $("div.sidebar-list").removeClass();
  $("div.mw-search-form-wrapper").removeClass();

  $("img").css("background-color", "#1d1d1d49");
  $("nav.vector-user-links, div.mw-aria-live-region").css("display", "none");

  $("body").prepend(
    `<header id="proxifiti-header">
      <p style="margin: 5px; margin-bottom: 0;">
        <strong>Live Source:&nbsp;</strong>
        <a href="${targetUrl}" target="_blank">${targetUrl}</a>
      </p>
    </header>`,
  );

  return $.html();
}

export default modifyHTML;
