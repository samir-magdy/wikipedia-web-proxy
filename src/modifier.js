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

function convertCollapsibles($) {
  $(".mw-collapsible").each((index, el) => {
    const $el = $(el);
    const $content = $el.find(".mw-collapsible-content");

    if ($content.length) {
      let summaryText = "";

      const $navboxTitle = $el.find(".navbox-title");
      if ($navboxTitle.length) {
        summaryText = $navboxTitle
          .text()
          .replace(/\s*(v|t|e)\s*/g, "")
          .trim();
      }

      if (!summaryText) {
        const $sidebarTitle = $el.find(".sidebar-list-title");
        if ($sidebarTitle.length) {
          summaryText = $sidebarTitle.text().trim();
        }
      }

      if (!summaryText) {
        const $heading = $el.find("h1, h2, h3, h4, h5, h6").first();
        if ($heading.length) {
          summaryText = $heading.text().trim();
        }
      }

      if (!summaryText) {
        const $th = $el.find("th").first();
        if ($th.length) {
          summaryText = $th.text().trim();
        }
      }

      if (!summaryText) {
        const $toggle = $el.find(".mw-collapsible-toggle");
        if ($toggle.length) {
          summaryText = $toggle
            .text()
            .replace(/[\[\]]/g, "")
            .trim();
        }
      }

      if (!summaryText) {
        summaryText =
          $el.attr("data-expandtext") || $el.attr("data-collapsetext") || "";
      }

      $el.find(".mw-collapsible-toggle").remove();

      const isOpen = !$el.hasClass("mw-collapsed");

      const $details = $("<details></details>");
      if (isOpen) {
        $details.attr("open", "");
      }

      const $summary = $("<summary></summary>").text(
        summaryText || "Show/Hide",
      );
      $details.append($summary);
      $details.append($content.contents());

      $el.replaceWith($details);
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
    caption.infobox-title,
    div.mw-search-profile-tabs,
    div#mw-imagepage-content, 
    div.portal-bar, 
    div.metadata, 
    div.mw-footer-container, div.plainlinks`).remove();

  $("img, source").removeAttr("srcset");

  $("title").text("WikiSpace");

  handleForms($, targetUrl);
  convertCollapsibles($);

  $("img, a, link, video, source, audio").each((index, element) => {
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
    } else if (tagName === "audio") {
      attribute = "src";
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
      <h1 id="main-title-wikispace">WikiSpace</h1>
      <p style="font-size: 2rem; letter-spacing: 1px;">A clutter free Wikipedia</p>
    </div>`,
  );

  $("nav, div#p-lang-btn").css({ visibility: "hidden" });

  $("input#searchInput").attr("placeholder", "Search WikiSpace");
  $("button.pure-button").text("Search");

  $("button.cdx-search-input__end-button.cdx-button")
    .removeClass()
    .addClass("button-bug");
  $("header.vector-header").removeClass("mw-header");
  $("form").removeClass("cdx-search-input--has-end-button");
  $("div.mw-search-form-wrapper").removeClass();

  const $footer = $('<footer id="source-footer"></footer>');
  const $p = $("<p></p>");
  const $strong = $("<strong>Live Source:&nbsp;</strong>");

  const $link = $("<a></a>")
    .attr("href", targetUrl)
    .attr("target", "_blank")
    .text(targetUrl);

  $p.append($strong).append($link);
  $footer.append($p);

  $("body").append($footer);

  $("body").prepend(`
  <div id="mobile-warning-overlay">
    <div class="overlay-content">
      <h2>Developer Notice:</h2>
      <p>This project is not currently optimized for mobile devices, please view from a desktop browser.</p>
    </div>
  </div>`);

  return $.html();
}

export default modifyHTML;
