// sketch.js
// Needs in index.html:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/opentype.js/1.3.4/opentype.min.js"></script>
// <script src="sketch.js"></script>

let otFontA = null;
let otFontB = null;

let textInput;
let sizeSlider;
let trackingSlider;
let axisModeSelect;
let cutSlider;
let cutLabel;
let savePngBtn;

let fontAStatusP;
let fontBStatusP;

const GREEN = "#1f6a3a";

function setup() {
  createCanvas(windowWidth, windowHeight - 220);
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
    s.style("max-width", "280px");
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

  const hint = createP("Preview: left/top half from A, right/bottom half from B. Clean clipping, no distortion.");
  hint.parent(fontsSec);
  hint.style("margin", "6px 0 0 0");
  hint.style("color", GREEN);
  hint.style("font-size", "11px");

  // Text
  const textSec = section("Text");

  textInput = createInput("BFD");
  textInput.parent(textSec);
  styleTextInput(textInput);
  textInput.input(redrawCanvas);

  // Preview params
  const paramSec = section("Preview");

  paramSec.child(createSpan("Font size"));

  sizeSlider = createSlider(48, 400, 260, 1);
  sizeSlider.parent(paramSec);
  sizeSlider.input(redrawCanvas);

  paramSec.child(createSpan("Tracking (letter spacing)"));

  trackingSlider = createSlider(-40, 120, 20, 1);
  trackingSlider.parent(paramSec);
  trackingSlider.input(redrawCanvas);

  // Split settings
  const axisSec = section("Split inside glyph");

  axisSec.child(createSpan("Mode"));

  axisModeSelect = createSelect();
  axisModeSelect.parent(axisSec);
  axisModeSelect.option("Vertical split (left/right)", "vertical");
  axisModeSelect.option("Horizontal split (top/bottom)", "horizontal");
  axisModeSelect.changed(redrawCanvas);

  cutLabel = createSpan("Cut position (0 = left / bottom, 100 = right / top)");
  cutLabel.parent(axisSec);

  cutSlider = createSlider(0, 100, 50, 1);
  cutSlider.parent(axisSec);
  cutSlider.input(redrawCanvas);

  // Export
  const exportSec = section("Export");

  savePngBtn = createButton("Save PNG");
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
  resizeCanvas(windowWidth, windowHeight - 220);
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
      if (which === "A") {
        fontAStatusP.html("Font A: error");
      } else {
        fontBStatusP.html("Font B: error");
      }
    });
}

function glyphAdvance(glyph, font, fontSize) {
  const unitsPerEm = font.unitsPerEm || 1000;
  const aw = glyph.advanceWidth || font.unitsPerEm;
  return aw * (fontSize / unitsPerEm);
}

// Compute glyph bounding box in *canvas pixels* for a given font size and baseline
function glyphBBoxPx(glyph, font, x, y, fontSize) {
  const unitsPerEm = font.unitsPerEm || 1000;
  const scale = fontSize / unitsPerEm;
  const bb = glyph.getBoundingBox(); // font units, y up

  const xMin = x + bb.x1 * scale;
  const xMax = x + bb.x2 * scale;
  const yMin = y - bb.y2 * scale;
  const yMax = y - bb.y1 * scale;

  return { xMin, xMax, yMin, yMax };
}

// Draw one split glyph using clipping
function drawSplitGlyph(ch, x, y, fontSize, mode, cutRatio) {
  const glyphA = otFontA.charToGlyph(ch);
  const glyphB = otFontB.charToGlyph(ch);
  if (!glyphA || !glyphB) return;

  const ctx = drawingContext;

  // Union bbox so both fonts are fully covered
  const bbA = glyphBBoxPx(glyphA, otFontA, x, y, fontSize);
  const bbB = glyphBBoxPx(glyphB, otFontB, x, y, fontSize);

  const xMin = Math.min(bbA.xMin, bbB.xMin);
  const xMax = Math.max(bbA.xMax, bbB.xMax);
  const yMin = Math.min(bbA.yMin, bbB.yMin);
  const yMax = Math.max(bbA.yMax, bbB.yMax);
  const w = xMax - xMin;
  const h = yMax - yMin;

  ctx.fillStyle = GREEN;

  if (mode === "vertical") {
    const splitX = xMin + cutRatio * w;

    // Left half from A
    ctx.save();
    ctx.beginPath();
    ctx.rect(xMin, yMin, splitX - xMin, h);
    ctx.clip();
    glyphA.getPath(x, y, fontSize).draw(ctx);
    ctx.restore();

    // Right half from B
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, yMin, xMax - splitX, h);
    ctx.clip();
    glyphB.getPath(x, y, fontSize).draw(ctx);
    ctx.restore();
  } else {
    // horizontal
    const splitY = yMax - cutRatio * h; // 0 bottom, 1 top

    // Bottom from B
    ctx.save();
    ctx.beginPath();
    ctx.rect(xMin, splitY, w, yMax - splitY);
    ctx.clip();
    glyphB.getPath(x, y, fontSize).draw(ctx);
    ctx.restore();

    // Top from A
    ctx.save();
    ctx.beginPath();
    ctx.rect(xMin, yMin, w, splitY - yMin);
    ctx.clip();
    glyphA.getPath(x, y, fontSize).draw(ctx);
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
  const fontSize = sizeSlider ? int(sizeSlider.value()) : 260;
  const tracking = trackingSlider ? int(trackingSlider.value()) : 20;
  const mode = axisModeSelect ? axisModeSelect.value() : "vertical";
  const cutRatio = (cutSlider ? cutSlider.value() : 50) / 100;

  cutLabel.html(
    mode === "vertical"
      ? "Cut position (0 = left, 100 = right)"
      : "Cut position (0 = bottom, 100 = top)"
  );

  let x = 40;
  let y = height * 0.75; // baseline vertically

  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];

    if (ch === "\n") {
      x = 40;
      y += fontSize * 1.4;
      continue;
    }

    const glyphA = otFontA.charToGlyph(ch);
    const glyphB = otFontB.charToGlyph(ch);
    if (!glyphA || !glyphB) continue;

    drawSplitGlyph(ch, x, y, fontSize, mode, cutRatio);

    const advA = glyphAdvance(glyphA, otFontA, fontSize);
    const advB = glyphAdvance(glyphB, otFontB, fontSize);
    const adv = (advA + advB) * 0.5;

    x += adv + tracking;

    if (x > width - 80) {
      x = 40;
      y += fontSize * 1.4;
    }
  }
}