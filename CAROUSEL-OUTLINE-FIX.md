# Carousel card outline fix

**Problem:** in the 3D shelf carousel, light-colored cards (white or beige edges) blend into the
light page background. The face has a thin black outline, but the edge strips, the rounded corners and
the flat top/bottom do not, so the top of the card and its radius disappear.

**Fix (what shipped in WebsitePortfolio, commits `f93cb8a`, `e63bad9`):**

1. **Edge strips (spines):** outline only the front and back rims, not the ends.
   ```css
   .cover .side { box-shadow: inset 1.5px 0 0 #000, inset -1.5px 0 0 #000; }
   ```
2. **Rounded-corner strips:** same color as the card, with rim lines that continue round the curve.
   ```css
   .cover .corner { background: var(--eb); box-shadow: inset 0 1.5px 0 #000, inset 0 -1.5px 0 #000; }
   ```
3. **Flat top and bottom caps:** add two strips between the corners so the slab has a top and bottom.
   Create `el._caps` (two `.cap` divs, appended after the corners). In `measure()`, with `r = W*RADIUS`, `t = W*THICKNESS`:
   ```js
   el._caps.forEach((c, k) => {
     const q = c.style;
     q.left = r - 0.5 + 'px'; q.width = W - 2 * r + 1 + 'px'; q.height = t + 1 + 'px';
     q.top = (k ? H : 0) - (t + 1) / 2 + 'px'; q.transform = 'rotateX(90deg)';
   });
   ```
   ```css
   .cover .cap { position: absolute; background: var(--eb); box-shadow: inset 0 1.5px 0 #000, inset 0 -1.5px 0 #000; }
   ```
4. **The part that actually closes the gap at the top of the curve:** a silhouette outline on the whole shelf.
   ```css
   .stage { filter: drop-shadow(1px 0 0 #000) drop-shadow(-1px 0 0 #000)
                    drop-shadow(0 1px 0 #000) drop-shadow(0 -1px 0 #000); }
   ```
   Lines drawn on the curved top are seen nearly edge-on and vanish; the filter outlines the final
   picture instead, so it works from any angle. Thickness = the `1px` offsets (use `.75px` for lighter).

## What did NOT work (don't retry)
- Outlining each corner segment fully: ragged stripes at every segment joint.
- Thicker (4px) rim lines on corners/caps: black blocks, top still open.
- Moving the cap outside the curve: spikes.
- Black "twin" shells behind the corners (inverted hull): the corner arcs are open strips, not closed shells, so the twin either covers the corner solid black or shows nothing.
- Solid black or darkened-gray corners: reads as a black/gray blob that alternates with the card color.

## Watch-outs
- **Smoothness:** the filter is redrawn every frame while cards glide. Test scrolling on a real phone.
  If it stutters, drop the filter on small screens
  (`@media (max-width: 700px) { .stage { filter: none; } }`) or use a lighter single
  `drop-shadow(0 0 .6px #000)` (softer, less crisp at the top of light cards).
- The filter outlines **everything inside `.stage`**, including any text/overlays you put there. Keep the
  header, bar and popups outside `.stage`.
- OC Bot Shows skips the 20 corner strips on far cards for performance (`index.html` ~line 884).
  Keep that, and also skip/hide the new cap strips for those far cards.
- OC Bot Shows has several `.stage` rules (~lines 255, 366, 409, 429) for different screen sizes.
  Add the `filter` to the **base** `.stage` rule only; don't redefine it in the media queries.
- Card edge colors come from `--eb` (per-card `edge:` in the card list). White or near-white edges are the
  ones that need this most.

## Prompt to give Claude for another site
> Open `/Users/luis/ocbotshows/index.html` and apply the card-outline fix described in
> `/Users/luis/WebsitePortfolio/CAROUSEL-OUTLINE-FIX.md`. Steps 1-4, keep its performance
> trick for far cards (skip the new caps too), and add the filter to the base `.stage` rule only.
> Take 4x zoomed headless Chrome screenshots of the top-left corner of a light card before and after,
> and iterate until the outline is continuous over the curve. Check phone widths too, and tell me if the
> filter hurts scrolling smoothness. Commit and push when I say so.

(Swap the path for any other site that uses the same shelf-carousel template, for example
`/Users/luis/labotshows` or `/Users/luis/Photobooth`.)
