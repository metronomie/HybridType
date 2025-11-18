// sketch.js
// p5.js + opentype.js hybrid preview
// - load Font A / Font B
// - split glyphs vertically or horizontally
// - per-font: relative size (uniform) + horizontal offset
// - styling: fill color, outline color, thickness, roundness, blurriness

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

// styling controls
let fillPicker, outlinePicker;
let outlineWidthSlider, outlineRoundSlider, outlineBlurSlider;

const DEFAULT_GREEN = "#1f6a3a";

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
  fontAStatusP.style("color", DEFAULT_GREEN);

  fontBStatusP = createP("Font B: none");
  fontBStatusP.parent(fontsSec);
  fontBStatusP.style("margin", "2px 0 0 0");
  fontBStatusP.style("color", DEFAULT_GREEN);

  const hint = createP(
    "Preview only. Split: left/top from A, right/bottom from B. Adjust per-font size/offset and outline."
  );
  hint.parent(fontsSec);
  hint.style("margin", "6px 0 0 0");
  hint.style("color", DEFAULT_GREEN);
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

  transASec.child(createSpan("Horizontal offset A (-30%..+30% of base size)"));
  offsetASlider = createSlider(-30, 30, 0, 1);
  offsetASlider.parent(transASec);
  offsetASlider.input(redrawCanvas);

  // Font B transform
  const transBSec = section("Font B transform");

  transBSec.child(createSpan("Size B (50–150 %)"));
  scaleBSlider = createSlider(50, 150, 100, 1);
  scaleBSlider.parent(transBSec);
  scaleBSlider.input(redrawCanvas);

  transBSec.child(createSpan("Horizontal offset B (-30%..+30% of base size)"));
  offsetBSlider = createSlider(-30, 30, 0, 1);
  offsetBSlider.parent(transBSec);
  offsetBSlider.input(redrawCanvas);

  // Styling
  const styleSec = section("Styling");

  const fillLabel = createSpan("Fill color");
  fillLabel.parent(styleSec);
  fillPicker = createColorPicker(DEFAULT_GREEN);
  fillPicker.parent(styleSec);
  fillPicker.input(redrawCanvas);

  const outlineLabel = createSpan("Outline color");
  outlineLabel.parent(styleSec);
  outlinePicker = createColorPicker("#000000");
  outlinePicker.parent(styleSec);
  outlinePicker.input(redrawCanvas);

  styleSec.child(createSpan("Outline thickness (0–40 px)"));
  outlineWidthSlider = createSlider(0, 40, 6, 1);
  outlineWidthSlider.parent(styleSec);
  outlineWidthSlider.input(redrawCanvas);

  styleSec.child(createSpan("Outline roundness (0 sharp – 1 bevel – 2 round)"));
  outlineRoundSlider = createSlider(0, 2, 2, 1);
  outlineRoundSlider.parent(styleSec);
  outlineRoundSlider.input(redrawCanvas);

  styleSec.child(createSpan("Outline blurriness (0–20)"));
  outlineBlurSlider = createSlider(0, 20, 0, 1);
  outlineBlurSlider.parent(styleSec);
  outlineBlurSlider.input(redrawCanvas);

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

// union bbox of glyph A and B in screen coordinates
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
  lineJoinType,
  blurAmount
) {
  const glyphA = otFontA.charToGlyph(ch);
  const glyphB = otFontB.charToGlyph(ch);
  if (!glyphA || !glyphB) return;

  const sizeA = baseSize * (scaleASlider.value() / 100);
  const sizeB = baseSize * (scaleBSlider.value() / 100);
  const offA = (offsetASlider.value() / 100) * baseSize;
  const offB = (offsetBSlider.value() / 100) * baseSize;

  const bbox = unionBBoxPx(glyphA, glyphB, xBase, yBase, sizeA, sizeB, offA, offB);
  const { xMin, xMax, yMin, yMax } = bbox;
  const w = xMax - xMin;
  const h = yMax - yMin;

  const ctx = drawingContext;

  const pathA = glyphA.getPath(xBase + offA, yBase, sizeA);
  const pathB = glyphB.getPath(xBase + offB, yBase, sizeB);

  // helper: draw half (fill then optional stroke)
  function drawHalf(path, rx, ry, rw, rh) {
    // fill
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();

    path.fill = fillColor;
    path.stroke = null;
    path.strokeWidth = 0;

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    path.draw(ctx);   // fill only
    ctx.restore();

    // outline
    if (outlineWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, ry, rw, rh);
      ctx.clip();

      path.fill = null;
      path.stroke = outlineColor;
      path.strokeWidth = outlineWidth;
      path.strokeJoin = lineJoinType;  // "miter", "bevel", "round"
      path.strokeCap = lineJoinType;

      if (blurAmount > 0) {
        ctx.shadowBlur = blurAmount;
        ctx.shadowColor = outlineColor;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } else {
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      path.draw(ctx); // stroke only
      ctx.restore();
    }
  }

  if (mode === "vertical") {
    const splitX = xMin + cutRatio * w;
    drawHalf(pathA, xMin, yMin, splitX - xMin, h);       // left from A
    drawHalf(pathB, splitX, yMin, xMax - splitX, h);     // right from B
  } else {
    const splitY = yMax - cutRatio * h;
    drawHalf(pathB, xMin, splitY, w, yMax - splitY);     // bottom from B
    drawHalf(pathA, xMin, yMin, w, splitY - yMin);       // top from A
  }
}

function draw() {
  background("#ffffff");

  if (!otFontA || !otFontB) {
    push();
    textFont(systemFont());
    fill(DEFAULT_GREEN);
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

  const fillColor = fillPicker ? fillPicker.value() : DEFAULT_GREEN;
  const outlineColor = outlinePicker ? outlinePicker.value() : "#000000";
  const outlineWidth = outlineWidthSlider ? outlineWidthSlider.value() : 0;
  const blurAmount = outlineBlurSlider ? outlineBlurSlider.value() : 0;

  let joinType = "miter";
  if (outlineRoundSlider) {
    const v = outlineRoundSlider.value();
    if (v == 1) joinType = "bevel";
    else if (v == 2) joinType = "round";
  }

  let x = 40;
  let y = height * 0.75;

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