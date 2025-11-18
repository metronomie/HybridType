// ----------------------------------------------------------
// HYBRID FONT PREVIEW TOOL
// p5.js + opentype.js
// SPLIT + OUTLINE + PER-FONT SCALE/OFFSET
// OUTLINES EXPAND OUTWARDS WITHOUT BEING CLIPPED
// ----------------------------------------------------------

let otFontA = null;
let otFontB = null;

// UI components
let textInput, sizeSlider, trackingSlider;
let axisModeSelect, cutSlider, cutLabel;
let fontAStatusP, fontBStatusP;
let scaleASlider, offsetASlider, scaleBSlider, offsetBSlider;
let fillPicker, outlinePicker;
let outlineWidthSlider, outlineRoundSlider, outlineBlurSlider;

const DEFAULT_GREEN = "#1f6a3a";

// ----------------------------------------------------------
// SETUP
// ----------------------------------------------------------
function setup() {
  createCanvas(windowWidth, windowHeight - 260);
  noLoop();

  const ui = createDiv();
  ui.style("padding", "8px");
  ui.style("font-family", systemFont());
  ui.style("font-size", "12px");
  ui.style("color", DEFAULT_GREEN);
  ui.style("background", "#ffffff");
  ui.style("display", "flex");
  ui.style("flex-wrap", "wrap");
  ui.style("gap", "16px");

  function section(title) {
    const s = createDiv();
    s.parent(ui);
    s.style("min-width", "230px");
    s.style("max-width", "340px");
    s.style("display", "flex");
    s.style("flex-direction", "column");
    s.style("gap", "4px");

    const h = createElement("h2", title);
    h.parent(s);
    h.style("margin", "0 0 4px 0");
    h.style("font-size", "13px");
    h.style("text-transform", "uppercase");
    h.style("letter-spacing", "0.08em");
    h.style("color", DEFAULT_GREEN);

    return s;
  }

  // --------------------------------------------------------
  // FONT SECTION
  // --------------------------------------------------------
  const fontsSec = section("Fonts");

  fontsSec.child(createSpan("Font A"));
  const fontAInput = createFileInput(f => handleFontFile(f, "A"));
  fontAInput.parent(fontsSec);

  fontsSec.child(createSpan("Font B"));
  const fontBInput = createFileInput(f => handleFontFile(f, "B"));
  fontBInput.parent(fontsSec);

  fontAStatusP = createP("Font A: none");
  fontAStatusP.parent(fontsSec);

  fontBStatusP = createP("Font B: none");
  fontBStatusP.parent(fontsSec);

  // --------------------------------------------------------
  // TEXT SECTION
  // --------------------------------------------------------
  const textSec = section("Text");

  textInput = createInput("ABFd");
  textInput.parent(textSec);
  styleTextInput(textInput);
  textInput.input(redrawCanvas);

  // --------------------------------------------------------
  // PREVIEW PARAMS
  // --------------------------------------------------------
  const paramSec = section("Preview");

  paramSec.child(createSpan("Base font size"));
  sizeSlider = createSlider(48, 400, 260, 1);
  sizeSlider.parent(paramSec);
  sizeSlider.input(redrawCanvas);

  paramSec.child(createSpan("Tracking"));
  trackingSlider = createSlider(-40, 120, 20, 1);
  trackingSlider.parent(paramSec);
  trackingSlider.input(redrawCanvas);

  // --------------------------------------------------------
  // SPLIT CONTROLS
  // --------------------------------------------------------
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

  // --------------------------------------------------------
  // FONT A TRANSFORM
  // --------------------------------------------------------
  const transASec = section("Font A transform");

  transASec.child(createSpan("Size A (50–150%)"));
  scaleASlider = createSlider(50, 150, 100, 1);
  scaleASlider.parent(transASec);
  scaleASlider.input(redrawCanvas);

  transASec.child(createSpan("Horizontal offset A (-30%..+30%)"));
  offsetASlider = createSlider(-30, 30, 0, 1);
  offsetASlider.parent(transASec);
  offsetASlider.input(redrawCanvas);

  // --------------------------------------------------------
  // FONT B TRANSFORM
  // --------------------------------------------------------
  const transBSec = section("Font B transform");

  transBSec.child(createSpan("Size B (50–150%)"));
  scaleBSlider = createSlider(50, 150, 100, 1);
  scaleBSlider.parent(transBSec);
  scaleBSlider.input(redrawCanvas);

  transBSec.child(createSpan("Horizontal offset B (-30%..+30%)"));
  offsetBSlider = createSlider(-30, 30, 0, 1);
  offsetBSlider.parent(transBSec);
  offsetBSlider.input(redrawCanvas);

  // --------------------------------------------------------
  // STYLING SECTION
  // --------------------------------------------------------
  const styleSec = section("Styling");

  styleSec.child(createSpan("Fill color"));
  fillPicker = createColorPicker(DEFAULT_GREEN);
  fillPicker.parent(styleSec);
  fillPicker.input(redrawCanvas);

  styleSec.child(createSpan("Outline color"));
  outlinePicker = createColorPicker("#000000");
  outlinePicker.parent(styleSec);
  outlinePicker.input(redrawCanvas);

  styleSec.child(createSpan("Outline thickness (0–40 px)"));
  outlineWidthSlider = createSlider(0, 40, 6, 1);
  outlineWidthSlider.parent(styleSec);
  outlineWidthSlider.input(redrawCanvas);

  styleSec.child(createSpan("Corner roundness (sharp → bevel → round)"));
  outlineRoundSlider = createSlider(0, 2, 2, 1);
  outlineRoundSlider.parent(styleSec);
  outlineRoundSlider.input(redrawCanvas);

  styleSec.child(createSpan("Outline blurriness / glow (0–20)"));
  outlineBlurSlider = createSlider(0, 20, 0, 1);
  outlineBlurSlider.parent(styleSec);
  outlineBlurSlider.input(redrawCanvas);

  // --------------------------------------------------------
  // EXPORT BUTTON
  // --------------------------------------------------------
  const exportSec = section("Export");
  const savePngBtn = createButton("Save PNG");
  savePngBtn.parent(exportSec);
  savePngBtn.mousePressed(() => saveCanvas("hybrid_preview", "png"));
}

// ----------------------------------------------------------
// STYLING HELPERS
// ----------------------------------------------------------
function systemFont() {
  return "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
}

function styleTextInput(inp) {
  inp.style("padding", "4px 6px");
  inp.style("border-radius", "4px");
  inp.style("border", "1px solid " + DEFAULT_GREEN);
  inp.style("background", "#ffffff");
  inp.style("color", DEFAULT_GREEN);
  inp.style("font-size", "14px");
  inp.style("width", "100%");
}

// ----------------------------------------------------------
// RESIZE
// ----------------------------------------------------------
function windowResized() {
  resizeCanvas(windowWidth, windowHeight - 260);
  redrawCanvas();
}

function redrawCanvas() {
  redraw();
}

// ----------------------------------------------------------
// FONT FILE HANDLING
// ----------------------------------------------------------
function handleFontFile(file, which) {
  if (!file) return;

  fetch(file.data)
    .then(res => res.arrayBuffer())
    .then(buf => {
      const font = opentype.parse(buf);
      if (which === "A") {
        otFontA = font;
        fontAStatusP.html("Font A: " + file.name);
      } else {
        otFontB = font;
        fontBStatusP.html("Font B: " + file.name);
      }
      redrawCanvas();
    });
}

// advance-width helper
function glyphAdvance(glyph, font, px) {
  const upm = font.unitsPerEm || 1000;
  return (glyph.advanceWidth || upm) * (px / upm);
}

// ----------------------------------------------------------
// UNION BOUNDING BOX FOR BOTH GLYPHS
// ----------------------------------------------------------
function unionBBoxPx(glyphA, glyphB, xBase, yBase, sizeA, sizeB, offA, offB) {
  const upmA = otFontA.unitsPerEm || 1000;
  const upmB = otFontB.unitsPerEm || 1000;

  const sA = sizeA / upmA;
  const sB = sizeB / upmB;

  const bbA = glyphA.getBoundingBox();
  const bbB = glyphB.getBoundingBox();

  const xMinA = (xBase + offA) + bbA.x1 * sA;
  const xMaxA = (xBase + offA) + bbA.x2 * sA;
  const yMinA = yBase - bbA.y2 * sA;
  const yMaxA = yBase - bbA.y1 * sA;

  const xMinB = (xBase + offB) + bbB.x1 * sB;
  const xMaxB = (xBase + offB) + bbB.x2 * sB;
  const yMinB = yBase - bbB.y2 * sB;
  const yMaxB = yBase - bbB.y1 * sB;

  return {
    xMin: Math.min(xMinA, xMinB),
    xMax: Math.max(xMaxA, xMaxB),
    yMin: Math.min(yMinA, yMinB),
    yMax: Math.max(yMaxA, yMaxB),
  };
}

// ----------------------------------------------------------
// CORE HYBRID DRAWING FUNCTION
// with OUTLINE NOT CLIPPED on outer edges
// ----------------------------------------------------------
function drawSplitGlyph(
  ch, xBase, yBase, baseSize, mode, cutRatio,
  fillColor, outlineColor, outlineWidth, joinType, blurAmount
) {
  const gA = otFontA.charToGlyph(ch);
  const gB = otFontB.charToGlyph(ch);
  if (!gA || !gB) return;

  const sizeA = baseSize * (scaleASlider.value() / 100);
  const sizeB = baseSize * (scaleBSlider.value() / 100);
  const offA = (offsetASlider.value() / 100) * baseSize;
  const offB = (offsetBSlider.value() / 100) * baseSize;

  const bbox = unionBBoxPx(gA, gB, xBase, yBase, sizeA, sizeB, offA, offB);
  const { xMin, xMax, yMin, yMax } = bbox;

  const w = xMax - xMin;
  const h = yMax - yMin;

  // ---- KEY FIX: OUTLINE PADDING OUTWARDS ----
  const pad = outlineWidth > 0 || blurAmount > 0
    ? outlineWidth * 2 + blurAmount + 4
    : 0;

  const ctx = drawingContext;

  const pathA = gA.getPath(xBase + offA, yBase, sizeA);
  const pathB = gB.getPath(xBase + offB, yBase, sizeB);

  function drawHalf(path, rx, ry, rw, rh) {
    // ---- FILL ----
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();

    path.fill = fillColor;
    path.stroke = null;
    path.strokeWidth = 0;

    ctx.shadowBlur = 0;
    path.draw(ctx);
    ctx.restore();

    // ---- OUTLINE ----
    if (outlineWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, ry, rw, rh);
      ctx.clip();

      path.fill = null;
      path.stroke = outlineColor;
      path.strokeWidth = outlineWidth;
      path.strokeJoin = joinType;
      path.strokeCap = joinType;

      ctx.shadowBlur = blurAmount;
      ctx.shadowColor = outlineColor;

      path.draw(ctx);
      ctx.restore();
    }
  }

  if (mode === "vertical") {
    const splitX = xMin + cutRatio * w;

    drawHalf(pathA, xMin - pad, yMin - pad, (splitX - xMin) + pad, h + pad * 2);
    drawHalf(pathB, splitX, yMin - pad, (xMax + pad) - splitX, h + pad * 2);

  } else {
    const splitY = yMax - cutRatio * h;

    drawHalf(pathB, xMin - pad, splitY, (xMax - xMin) + pad * 2, (yMax + pad) - splitY);
    drawHalf(pathA, xMin - pad, yMin - pad, (xMax - xMin) + pad * 2, (splitY - yMin) + pad);
  }
}

// ----------------------------------------------------------
// MAIN DRAW
// ----------------------------------------------------------
function draw() {
  background("#ffffff");

  if (!otFontA || !otFontB) {
    push();
    fill(DEFAULT_GREEN);
    textSize(16);
    textFont(systemFont());
    text("Load Font A and Font B.", 40, 60);
    pop();
    return;
  }

  const txt = textInput.value();
  const baseSize = sizeSlider.value();
  const tracking = trackingSlider.value();
  const mode = axisModeSelect.value();
  const cutRatio = cutSlider.value() / 100;

  cutLabel.html(
    mode === "vertical"
      ? "Cut position (0 = left, 100 = right)"
      : "Cut position (0 = bottom, 100 = top)"
  );

  const fillColor = fillPicker.value();
  const outlineColor = outlinePicker.value();
  const outlineWidth = outlineWidthSlider.value();
  const blurAmount = outlineBlurSlider.value();

  let joinType = "miter";
  if (outlineRoundSlider.value() === 1) joinType = "bevel";
  if (outlineRoundSlider.value() === 2) joinType = "round";

  let x = 40;
  let y = height * 0.75;

  for (let c of txt) {
    if (c === "\n") {
      x = 40;
      y += baseSize * 1.4;
      continue;
    }
    const gA = otFontA.charToGlyph(c);
    const gB = otFontB.charToGlyph(c);
    if (!gA || !gB) continue;

    drawSplitGlyph(
      c, x, y, baseSize, mode, cutRatio,
      fillColor, outlineColor, outlineWidth, joinType, blurAmount
    );

    const advA = glyphAdvance(gA, otFontA, baseSize);
    const advB = glyphAdvance(gB, otFontB, baseSize);
    const adv = (advA + advB) * 0.5;

    x += adv + tracking;

    if (x > width - 80) {
      x = 40;
      y += baseSize * 1.4;
    }
  }
}