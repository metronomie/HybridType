// sketch.js
// p5.js + opentype.js hybrid preview
// - load Font A / Font B
// - split glyphs vertically or horizontally
// - per-font: relative size (uniform scale) + horizontal offset

let otFontA = null;
let otFontB = null;

let textInput;
let sizeSlider;
let trackingSlider;
let axisModeSelect;
let cutSlider;
let cutLabel;

let fontAStatusP;
let fontBStatusP;

// per-font controls
let scaleASlider, offsetASlider;
let scaleBSlider, offsetBSlider;

const GREEN = "#1f6a3a";

function setup() {
  createCanvas(windowWidth, windowHeight - 240);
  noLoop();

  const ui = createDiv();
  ui.style("padding", "8px");
  ui.style("font-family", systemFont());
  ui.style("font-size", "12px");
  ui.style("color", GREEN);
  ui.style("background", "#ffffff");
  ui.style("display", "flex");
  ui.style("flex-wrap", "wrap");
  ui.style("gap", "16px");

  function section(title) {
    const s = createDiv();
    s.parent(ui);
    s.style("min-width", "230px");
    s.style("max-width", "320px");
    s.style("display", "flex");
    s.style("flex-direction", "column");
    s.style("gap", "4px");

    const h = createElement("h2", title);
    h.parent(s);
    h.style("margin", "0 0 4px 0");
    h.style("font-size", "13px");
    h.style("text-transform", "uppercase");
    h.style("letter-spacing", "0.08em");
    h.style("color", GREEN);

    return s;
  }

  // Fonts
  const fontsSec = section("Fonts");

  fontsSec.child(createSpan("Font A"));

  const fontAInput = createFileInput(f => handleFontFile(f, "A"));
  fontAInput.parent(fontsSec);
  fontAInput.style("font-size", "11px");

  fontsSec.child(createSpan("Font B"));

  const fontBInput = createFileInput(f => handleFontFile(f, "B"));
  fontBInput.parent(fontsSec);
  fontBInput.style("font-size", "11px");

  fontAStatusP = createP("Font A: none");
  fontAStatusP.parent(fontsSec);
  fontAStatusP.style("margin", "4px 0 0 0");
  fontAStatusP.style("color", GREEN);

  fontBStatusP = createP("Font B: none");
  fontBStatusP.parent(fontsSec);
  fontBStatusP.style("margin", "2px 0 0 0");
  fontBStatusP.style("color", GREEN);

  const hint = createP(
    "Preview only. Split: left/top from A, right/bottom from B. Adjust per-font size and horizontal offset."
  );
  hint.parent(fontsSec);
  hint.style("margin", "6px 0 0 0");
  hint.style("color", GREEN);
  hint.style("font-size", "11px");

  // Text
  const textSec = section("Text");

  textInput = createInput("ABFd");
  textInput.parent(textSec);
  styleTextInput(textInput);
  textInput.input(redrawCanvas);

  // Preview params
  const paramSec = section("Preview");

  paramSec.child(createSpan("Base font size"));
  sizeSlider = createSlider(48, 400, 260, 1);
  sizeSlider.parent(paramSec);
  sizeSlider.input(redrawCanvas);

  paramSec.child(createSpan("Tracking (letter spacing)"));
  trackingSlider = createSlider(-40, 120, 20, 1);
  trackingSlider.parent(paramSec);
  trackingSlider.input(redrawCanvas);

  // Split settings
  const splitSec = section("Split inside glyph");

  splitSec.child(createSpan("Mode"));
  axisModeSelect = createSelect();
  axisModeSelect.parent(splitSec);
  axisModeSelect.option("Vertical split (left/right)", "vertical");
  axisModeSelect.option("Horizontal split (top/bottom)", "horizontal");
  axisModeSelect.changed(redrawCanvas);

  cutLabel = createSpan("Cut position (0 = left, 100 = right)");
  cutLabel.parent(splitSec);

  cutSlider = createSlider(0, 100, 50, 1);
  cutSlider.parent(splitSec);
  cutSlider.input(redrawCanvas);

  // Font A transform
  const transASec = section("Font A transform");

  transASec.child(createSpan("Size A (50–150 %)"));
  scaleASlider = createSlider(50, 150, 100, 1);
  scaleASlider.parent(transASec);
  scaleASlider.input(redrawCanvas);

  transASec.child(createSpan("Horizontal offset A (-30%..+30% of size)"));
  offsetASlider = createSlider(-30, 30, 0, 1);
  offsetASlider.parent(transASec);
  offsetASlider.input(redrawCanvas);

  // Font B transform
  const transBSec = section("Font B transform");

  transBSec.child(createSpan("Size B (50–150 %)"));
  scaleBSlider = createSlider(50, 150, 100, 1);
  scaleBSlider.parent(transBSec);
  scaleBSlider.input(redrawCanvas);

  transBSec.child(createSpan("Horizontal offset B (-30%..+30% of size)"));
  offsetBSlider = createSlider(-30, 30, 0, 1);
  offsetBSlider.parent(transBSec);
  offsetBSlider.input(redrawCanvas);

  // Export
  const exportSec = section("Export");
  const savePngBtn = createButton("Save PNG");
  savePngBtn.parent(exportSec);
  savePngBtn.mousePressed(() => saveCanvas("hybrid_preview", "png"));
}

function systemFont() {
  return "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
}

function styleTextInput(inp) {
  inp.style("padding", "4px 6px");
  inp.style("border-radius", "4px");
  inp.style("border", "1px solid " + GREEN);
  inp.style("background", "#ffffff");
  inp.style("color", GREEN);
  inp.style("font-size", "14px");
  inp.style("width", "100%");
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight - 240);
  redrawCanvas();
}

function redrawCanvas() {
  redraw();
}

function handleFontFile(file, which) {
  if (!file) return;

  fetch(file.data)
    .then(res => res.arrayBuffer())
    .then(buffer => {
      const font = opentype.parse(buffer);
      if (which === "A") {
        otFontA = font;
        fontAStatusP.html("Font A: " + (file.name || "loaded"));
      } else {
        otFontB = font;
        fontBStatusP.html("Font B: " + (file.name || "loaded"));
      }
      redrawCanvas();
    })
    .catch(err => {
      console.error("Error loading font", err);
      if (which === "A") fontAStatusP.html("Font A: error");
      else fontBStatusP.html("Font B: error");
    });
}

function glyphAdvance(glyph, font, sizePx) {
  const unitsPerEm = font.unitsPerEm || 1000;
  const aw = glyph.advanceWidth || font.unitsPerEm;
  const scale = sizePx / unitsPerEm;
  return aw * scale;
}

// compute union bbox of glyph A and B in screen coordinates
function unionBBoxPx(glyphA, glyphB, xBase, yBase, sizeA, sizeB, offA, offB) {
  const upmA = otFontA.unitsPerEm || 1000;
  const upmB = otFontB.unitsPerEm || 1000;

  const scaleA = sizeA / upmA;
  const scaleB = sizeB / upmB;

  const bbA = glyphA.getBoundingBox();
  const bbB = glyphB.getBoundingBox();

  const xMinA = (xBase + offA) + bbA.x1 * scaleA;
  const xMaxA = (xBase + offA) + bbA.x2 * scaleA;
  const yMinA = yBase - bbA.y2 * scaleA;
  const yMaxA = yBase - bbA.y1 * scaleA;

  const xMinB = (xBase + offB) + bbB.x1 * scaleB;
  const xMaxB = (xBase + offB) + bbB.x2 * scaleB;
  const yMinB = yBase - bbB.y2 * scaleB;
  const yMaxB = yBase - bbB.y1 * scaleB;

  return {
    xMin: Math.min(xMinA, xMinB),
    xMax: Math.max(xMaxA, xMaxB),
    yMin: Math.min(yMinA, yMinB),
    yMax: Math.max(yMaxA, yMaxB)
  };
}

function drawSplitGlyph(ch, xBase, yBase, fontSize, mode, cutRatio) {
  const glyphA = otFontA.charToGlyph(ch);
  const glyphB = otFontB.charToGlyph(ch);
  if (!glyphA || !glyphB) return;

  const sizeA = fontSize * (scaleASlider.value() / 100);
  const sizeB = fontSize * (scaleBSlider.value() / 100);
  const offA = (offsetASlider.value() / 100) * fontSize;
  const offB = (offsetBSlider.value() / 100) * fontSize;

  const bbox = unionBBoxPx(glyphA, glyphB, xBase, yBase, sizeA, sizeB, offA, offB);
  const { xMin, xMax, yMin, yMax } = bbox;
  const w = xMax - xMin;
  const h = yMax - yMin;

  const ctx = drawingContext;
  ctx.fillStyle = GREEN;

  // prebuild paths with actual drawing size/position so we don't transform later
  const pathA = glyphA.getPath(xBase + offA, yBase, sizeA);
  const pathB = glyphB.getPath(xBase + offB, yBase, sizeB);

  if (mode === "vertical") {
    const splitX = xMin + cutRatio * w;

    // left from A
    ctx.save();
    ctx.beginPath();
    ctx.rect(xMin, yMin, splitX - xMin, h);
    ctx.clip();
    pathA.draw(ctx);
    ctx.restore();

    // right from B
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, yMin, xMax - splitX, h);
    ctx.clip();
    pathB.draw(ctx);
    ctx.restore();
  } else {
    const splitY = yMax - cutRatio * h; // 0 bottom, 1 top

    // bottom from B
    ctx.save();
    ctx.beginPath();
    ctx.rect(xMin, splitY, w, yMax - splitY);
    ctx.clip();
    pathB.draw(ctx);
    ctx.restore();

    // top from A
    ctx.save();
    ctx.beginPath();
    ctx.rect(xMin, yMin, w, splitY - yMin);
    ctx.clip();
    pathA.draw(ctx);
    ctx.restore();
  }
}

function draw() {
  background("#ffffff");

  if (!otFontA || !otFontB) {
    push();
    textFont(systemFont());
    fill(GREEN);
    textSize(16);
    text("Load Font A and Font B.", 40, 60);
    pop();
    return;
  }

  const txt = textInput ? textInput.value() : "";
  const baseSize = sizeSlider ? int(sizeSlider.value()) : 260;
  const tracking = trackingSlider ? int(trackingSlider.value()) : 20;
  const mode = axisModeSelect ? axisModeSelect.value() : "vertical";
  const cutRatio = (cutSlider ? cutSlider.value() : 50) / 100;

  cutLabel.html(
    mode === "vertical"
      ? "Cut position (0 = left, 100 = right)"
      : "Cut position (0 = bottom, 100 = top)"
  );

  const sizeA = baseSize * (scaleASlider.value() / 100);
  const sizeB = baseSize * (scaleBSlider.value() / 100);

  let x = 40;
  let y = height * 0.75;

  fill(GREEN);
  noStroke();

  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];

    if (ch === "\n") {
      x = 40;
      y += baseSize * 1.4;
      continue;
    }

    const glyphA = otFontA.charToGlyph(ch);
    const glyphB = otFontB.charToGlyph(ch);
    if (!glyphA || !glyphB) continue;

    drawSplitGlyph(ch, x, y, baseSize, mode, cutRatio);

    const advA = glyphAdvance(glyphA, otFontA, sizeA);
    const advB = glyphAdvance(glyphB, otFontB, sizeB);
    const adv = (advA + advB) * 0.5;

    x += adv + tracking;

    if (x > width - 80) {
      x = 40;
      y += baseSize * 1.4;
    }
  }
}