// ----------------------------------------------------------
// HYBRID FONT PREVIEW TOOL
// p5.js + opentype.js
// SPLIT + OUTLINE + PER-FONT SCALE/OFFSET
// OUTLINE EXPANDS OUTWARDS ONLY (stroke outside, fill hides inside)
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

  const hint = createP(
    "Preview only. Split: left/top from A, right/bottom from B. Adjust per-font size/offset and outline."
  );
  hint.parent(fontsSec);
  hint.style("margin", "6px 0 0 0");
  hint.style("font-size", "11px");

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

  transASec.child(createSpan("Horizontal offset A (-30%..+30% base size)"));
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

  transBSec.child(createSpan("Horizontal offset B (-30%..+30% base size)"));
  offsetBSlider = createSlider(-30, 30, 0, 1);
  offsetBSlider.parent(transBSec);
  offsetBSlider.input(redrawCanvas);

  // --------------------------------------------------------
  // STYLING
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

  styleSec.child(createSpan("Corner roundness (0 sharp – 1 bevel – 2 round)"));
  outlineRoundSlider = createSlider(0, 2, 2, 1);
  outlineRoundSlider.parent(styleSec);
  outlineRoundSlider.input(redrawCanvas);

  styleSec.child(createSpan("Outline blurriness / glow (0–20)"));
  outlineBlurSlider = createSlider(0, 20, 0, 1);
  outlineBlurSlider.parent(styleSec);
  outlineBlurSlider.input(redrawCanvas);

  // --------------------------------------------------------
  // EXPORT
  // --------------------------------------------------------
  const exportSec = section("Export");
  const savePngBtn = createButton("Save PNG");
  savePngBtn.parent(exportSec);
  savePngBtn.mousePressed(() => saveCanvas("hybrid_preview", "png"));
}

// ----------------------------------------------------------
// HELPERS
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight - 260);
  redrawCanvas();
}

function redrawCanvas() {
  redraw();
}

// ----------------------------------------------------------
// FONT LOADING
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

function glyphAdvance(glyph, font, sizePx) {
  const upm = font.unitsPerEm || 1000;
  const aw = glyph.advanceWidth || upm;
  return aw * (sizePx / upm);
}

// union bounding box of A and B in screen coords
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
    yMax: Math.max(yMaxA, yMaxB)
  };
}

// ----------------------------------------------------------
// PATH REPLAY (instead of opentype.Path.draw)
// so we control stroke width, join, etc.
// ----------------------------------------------------------
function tracePathOnContext(ctx, path) {
  ctx.beginPath();
  const cmds = path.commands;
  for (let i = 0; i < cmds.length; i++) {
    const c = cmds[i];
    if (c.type === "M") {
      ctx.moveTo(c.x, c.y);
    } else if (c.type === "L") {
      ctx.lineTo(c.x, c.y);
    } else if (c.type === "C") {
      ctx.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
    } else if (c.type === "Q") {
      ctx.quadraticCurveTo(c.x1, c.y1, c.x, c.y);
    } else if (c.type === "Z") {
      ctx.closePath();
    }
  }
}

// ----------------------------------------------------------
// DRAW ONE HYBRID GLYPH
// with outer-only outline (stroke first, fill on top)
// ----------------------------------------------------------
function drawSplitGlyph(
  ch,
  xBase,
  yBase,
  baseSize,
  mode,
  cutRatio,
  fillColor,
  outlineColor,
  outlineWidth,
  joinType,
  blurAmount
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

  // Padding so outer stroke + blur are visible
  const pad = outlineWidth > 0 || blurAmount > 0
    ? outlineWidth * 2 + blurAmount + 4
    : 0;

  const ctx = drawingContext;

  // Build paths in final screen coordinates
  const pathA = gA.getPath(xBase + offA, yBase, sizeA);
  const pathB = gB.getPath(xBase + offB, yBase, sizeB);

  function drawHalf(path, rx, ry, rw, rh) {
    // --- STROKE FIRST (outer), then FILL ---
    // Stroke pass (with blur)
    if (outlineWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, ry, rw, rh);
      ctx.clip();

      ctx.lineWidth = outlineWidth;
      ctx.lineJoin = joinType;
      ctx.lineCap = joinType;
      ctx.strokeStyle = outlineColor;

      ctx.shadowBlur = blurAmount;
      ctx.shadowColor = outlineColor;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      tracePathOnContext(ctx, path);
      ctx.stroke();
      ctx.restore();
    }

    // Fill pass (no blur) on top,
    // hiding the inner half of the stroke → visually outer-only.
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();

    ctx.shadowBlur = 0;
    ctx.fillStyle = fillColor;

    tracePathOnContext(ctx, path);
    ctx.fill();
    ctx.restore();
  }

  if (mode === "vertical") {
    const splitX = xMin + cutRatio * w;

    // Left half from A: expand outward on left/top/bottom
    const leftX = xMin - pad;
    const leftY = yMin - pad;
    const leftW = (splitX - xMin) + pad;
    const leftH = h + 2 * pad;
    drawHalf(pathA, leftX, leftY, leftW, leftH);

    // Right half from B: expand outward on right/top/bottom
    const rightX = splitX;
    const rightY = yMin - pad;
    const rightW = (xMax + pad) - splitX;
    const rightH = h + 2 * pad;
    drawHalf(pathB, rightX, rightY, rightW, rightH);
  } else {
    const splitY = yMax - cutRatio * h;

    // Bottom half from B: expand outward on bottom/left/right
    const bottomX = xMin - pad;
    const bottomY = splitY;
    const bottomW = (xMax - xMin) + 2 * pad;
    const bottomH = (yMax + pad) - splitY;
    drawHalf(pathB, bottomX, bottomY, bottomW, bottomH);

    // Top half from A: expand outward on top/left/right
    const topX = xMin - pad;
    const topY = yMin - pad;
    const topW = (xMax - xMin) + 2 * pad;
    const topH = (splitY - yMin) + pad;
    drawHalf(pathA, topX, topY, topW, topH);
  }
}

// ----------------------------------------------------------
// MAIN DRAW LOOP
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
  const r = outlineRoundSlider.value();
  if (r === 1) joinType = "bevel";
  if (r === 2) joinType = "round";

  let x = 40;
  let y = height * 0.75;

  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];

    if (ch === "\n") {
      x = 40;
      y += baseSize * 1.4;
      continue;
    }

    const gA = otFontA.charToGlyph(ch);
    const gB = otFontB.charToGlyph(ch);
    if (!gA || !gB) continue;

    drawSplitGlyph(
      ch,
      x,
      y,
      baseSize,
      mode,
      cutRatio,
      fillColor,
      outlineColor,
      outlineWidth,
      joinType,
      blurAmount
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