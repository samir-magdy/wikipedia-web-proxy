// WikiSpace: images are only fetched when the user hovers over them.
// The server (src/modifier.js) puts a placeholder in `src` and the real
// proxied URL in `data-src`; this swaps them in on first interaction.

function revealImage(img) {
  if (img.hasAttribute("data-loading")) return;
  img.setAttribute("data-loading", "");

  // Download and decode the image off-screen first, so the placeholder stays
  // visible until the real image is ready to paint. Swapping `src` directly
  // would show the empty <img> (and its light background) while it loads.
  const realSrc = img.dataset.src;
  const loader = new Image();
  loader.src = realSrc;
  loader
    .decode()
    .then(() => {
      img.src = realSrc; // already in the browser cache, so no second request
      img.removeAttribute("data-src");
      img.classList.add("ws-revealed"); // fade-in, see wikispace.css
    })
    .catch(() => {
      // Failed to load: keep the placeholder so the next hover retries.
    })
    .finally(() => img.removeAttribute("data-loading"));
}

// Mouse: load an image the first time the pointer enters it.
document.addEventListener("mouseover", (event) => {
  const img = event.target.closest("img[data-src]");
  if (img) revealImage(img);
});

// Keyboard: load images inside a link (or other element) when it gets focus.
document.addEventListener("focusin", (event) => {
  event.target.querySelectorAll("img[data-src]").forEach(revealImage);
});
