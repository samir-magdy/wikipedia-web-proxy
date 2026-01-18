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
  $(`
    script,
    noscript,
    iframe,
    object,
    embed,
    audio,
    link[rel="preload"],
    link[rel="prefetch"],
    link[rel="dns-prefetch"],
    link[rel="preconnect"],
    link[rel="modulepreload"],
    meta[http-equiv="refresh"],
    div#mw-interwiki-results,
    nav.vector-toc-landmark,
    div.vector-body-before-content,
    div#contentSub,
    div.vector-column-start,
    div.vector-column-end,
    footer,
    ul#filetoc,
    ul.portalbox,
    div.vector-page-toolbar,
    div.vector-header-start,
    div.styled-select,
    nav[data-jsl10n="all-languages-nav-label"],
    table.plainlinks,
    table.box-More_citations_needed,
    div.side-box,
    div.spoken-wikipedia,
    div.nowraplinks,
    div.navbox,
    div.catlinks,
    div.wikipedia25-cta-container,
    div#shared-image-desc,
    div#mw-sharedupload,
    nav.vector-user-links,
    div.mw-aria-live-region,
    span.mw-editsection,
    sup,
    span.cdx-text-input__icon,
    a.cdx-button,
    hr,
    div.mw-search-spinner,
    td > style,
    caption.infobox-title`).remove();

  $("img, source").removeAttr("srcset");

  $("title").text("WikiSpace");

  handleForms($, targetUrl);

  $("img, a, link, video, source").each((index, element) => {
    const tagName = element.tagName.toLowerCase();
    let attribute;
    let route;

    if (tagName === "img") {
      attribute = "src";
      route = "/resource";
      $(element).attr("loading", "lazy");
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

  // Build the custom persistent header securly with cheerio:

  const $header = $('<header id="proxifiti-header"></header>');
  const $p = $("<p></p>");
  const $strong = $("<strong>Live Source:&nbsp;</strong>");

  const $link = $("<a></a>")
    .attr("href", targetUrl)
    .attr("target", "_blank")
    .text(targetUrl);

  $p.append($strong).append($link);
  $header.append($p);

  $("body").prepend($header);

  return $.html();
}

export default modifyHTML;
