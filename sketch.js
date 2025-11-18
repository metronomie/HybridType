// ----------------------------------------------------------
// HYBRID FONT POSTER TOOL
// p5.js + opentype.js
// - hybrid split letters (A/B)
// - per-font scale + offset
// - outline (thickness, roundness, blur)
// - poster format controls
// - paragraphs with line height + orientation
// - background color / gradient / image
// - simple split animation
// ----------------------------------------------------------

let otFontA = null;
let otFontB = null;

// UI
let textInput;
let sizeSlider, trackingSlider;
let axisModeSelect, cutSlider, cutLabel;
let fontAStatusP, fontBStatusP;
let scaleASlider, offsetASlider, scaleBSlider, offsetBSlider;
let fillPicker, outlinePicker;
let outlineWidthSlider, outlineRoundSlider, outlineBlurSlider;

let canvasWidthInput, canvasHeightInput, applyFormatButton;
let lineHeightSlider, orientationSelect;

let bgModeSelect, bgColor1Picker, bgColor2Picker, bgImageInput;
let bgImg = null;

let animateCheckbox, animSpeedSlider, animAmplitudeSlider;

let posterWidth, posterHeight;

const DEFAULT_GREEN = "#1f6a3a";

// ----------------------------------------------------------
// SETUP
// ----------------------------------------------------------
function setup() {
  posterWidth = windowWidth;
  posterHeight = windowHeight - 260;

  createCanvas(posterWidth, posterHeight);
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
    s.style("min-width", "250px");
    s.style("max-width", "380px");
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
  // FORMAT / POSTER SECTION
  // --------------------------------------------------------
  const formatSec = section("Poster format");

  const formatRow = createDiv();
  formatRow.parent(formatSec);
  formatRow.style("display", "flex");
  formatRow.style("gap", "6px");
  formatRow.style("align-items", "center");

  const wLabel = createSpan("Width (px)");
  wLabel.parent(formatRow);
  canvasWidthInput = createInput(posterWidth.toString());
  canvasWidthInput.parent(formatRow);
  canvasWidthInput.attribute("type", "number");
  canvasWidthInput.style("width", "80px");

  const hLabel = createSpan("Height (px)");
  hLabel.parent(formatRow);
  canvasHeightInput = createInput(posterHeight.toString());
  canvasHeightInput.parent(formatRow);
  canvasHeightInput.attribute("type", "number");
  canvasHeightInput.style("width", "80px");

  applyFormatButton = createButton("Apply format");
  applyFormatButton.parent(formatSec);
  applyFormatButton.mousePressed(applyFormat);

  const orientRow = createDiv();
  orientRow.parent(formatSec);
  orientRow.style("display", "flex");
  orientRow.style("gap", "6px");
  orientRow.style("align-items", "center");
  orientRow.child(createSpan("Text orientation"));

  orientationSelect = createSelect();
  orientationSelect.parent(orientRow);
  orientationSelect.option("Horizontal (left → right)", "horizontal");
  orientationSelect.option("Vertical (top → bottom columns)", "vertical");
  orientationSelect.changed(redrawCanvas);

  formatSec.child(createSpan("Line height multiplier"));
  lineHeightSlider = createSlider(0.8, 2.5, 1.4, 0.05);
  lineHeightSlider.parent(formatSec);
  lineHeightSlider.input(redrawCanvas);

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
    "Hybrid preview: A/B split per glyph. Use text, layout, and background to design animated posters."
  );
  hint.parent(fontsSec);
  hint.style("margin", "6px 0 0 0");
  hint.style("font-size", "11px");

  // --------------------------------------------------------
  // TEXT SECTION (PARAGRAPHS)
// --------------------------------------------------------
  const textSec = section("Text");

  const textLabel = createSpan("Text (paragraphs, use Enter for new lines)");
  textLabel.parent(textSec);

  textInput = createElement("textarea");
  textInput.parent(textSec);
  textInput.style("width", "100%");
  textInput.style("height", "120px");
  textInput.style("padding", "4px 6px");
  textInput.style("border-radius", "4px");
  textInput.style("border", "1px solid " + DEFAULT_GREEN);
  textInput.style("resize", "vertical");
  textInput.value("BFD\nHybrid type posters\nare fun.");
  textInput.input(redrawCanvas);

  const sizeRow = createDiv();
  sizeRow.parent(textSec);
  sizeRow.child(createSpan("Base font size"));
  sizeSlider = createSlider(32, 400, 200, 1);
  sizeSlider.parent(sizeRow);
  sizeSlider.input(redrawCanvas);

  const trackRow = createDiv();
  trackRow.parent(textSec);
  trackRow.child(createSpan("Tracking (letter spacing)"));
  trackingSlider = createSlider(-40, 120, 10, 1);
  trackingSlider.parent(trackRow);
  trackingSlider.input(redrawCanvas);

  // --------------------------------------------------------
  // SPLIT SECTION
  // --------------------------------------------------------
  const splitSec = section("Split inside glyph");

  const modeRow = createDiv();
  modeRow.parent(splitSec);
  modeRow.child(createSpan("Mode"));

  axisModeSelect = createSelect();
  axisModeSelect.parent(modeRow);
  axisModeSelect.option("Vertical split (left/right)", "vertical");
  axisModeSelect.option("Horizontal split (top/bottom)", "horizontal");
  axisModeSelect.changed(redrawCanvas);

  cutLabel = createSpan("Cut position (0 = left, 100 = right)");
  cutLabel.parent(splitSec);

  cutSlider = createSlider(0, 100, 50, 1);
  cutSlider.parent(splitSec);
  cutSlider.input(redrawCanvas);

  // --------------------------------------------------------
  // FONT TRANSFORMS
  // --------------------------------------------------------
  const transASec = section("Font A transform");
  transASec.child(createSpan("Size A (50–150%)"));
  scaleASlider = createSlider(50, 150, 100, 1);
  scaleASlider.parent(transASec);
  scaleASlider.input(redrawCanvas);

  transASec.child(createSpan("Horizontal offset A (-30%..+30% of base size)"));
  offsetASlider = createSlider(-30, 30, 0, 1);
  offsetASlider.parent(transASec);
  offsetASlider.input(redrawCanvas);

  const transBSec = section("Font B transform");
  transBSec.child(createSpan("Size B (50–150%)"));
  scaleBSlider = createSlider(50, 150, 100, 1);
  scaleBSlider.parent(transBSec);
  scaleBSlider.input(redrawCanvas);

  transBSec.child(createSpan("Horizontal offset B (-30%..+30% of base size)"));
  offsetBSlider = createSlider(-30, 30, 0, 1);
  offsetBSlider.parent(transBSec);
  offsetBSlider.input(redrawCanvas);

  // --------------------------------------------------------
  // STYLING SECTION (FILL + OUTLINE)
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
  // BACKGROUND SECTION
  // --------------------------------------------------------
  const bgSec = section("Background");

  const bgModeRow = createDiv();
  bgModeRow.parent(bgSec);
  bgModeRow.child(createSpan("Mode"));

  bgModeSelect = createSelect();
  bgModeSelect.parent(bgModeRow);
  bgModeSelect.option("Solid color", "solid");
  bgModeSelect.option("Vertical gradient", "gradient");
  bgModeSelect.option("Image", "image");
  bgModeSelect.changed(redrawCanvas);

  bgSec.child(createSpan("Color 1"));
  bgColor1Picker = createColorPicker("#ffffff");
  bgColor1Picker.parent(bgSec);
  bgColor1Picker.input(redrawCanvas);

  bgSec.child(createSpan("Color 2 (for gradient)"));
  bgColor2Picker = createColorPicker("#cccccc");
  bgColor2Picker.parent(bgSec);
  bgColor2Picker.input(redrawCanvas);

  bgSec.child(createSpan("Background image"));
  bgImageInput = createFileInput(handleBgImageFile);
  bgImageInput.parent(bgSec);

  // --------------------------------------------------------
  // ANIMATION SECTION
  // --------------------------------------------------------
  const animSec = section("Animation");

  animateCheckbox = createCheckbox("Animate split", false);
  animateCheckbox.parent(animSec);
  animateCheckbox.changed(handleAnimationState);

  animSec.child(createSpan("Speed"));
  animSpeedSlider = createSlider(0.1, 3.0, 1.0, 0.05);
  animSpeedSlider.parent(animSec);
  animSpeedSlider.input(redrawCanvas);

  animSec.child(createSpan("Amplitude (0–0.5 of full range)"));
  animAmplitudeSlider = createSlider(0.0, 0.5, 0.15, 0.01);
  animAmplitudeSlider.parent(animSec);
  animAmplitudeSlider.input(redrawCanvas);

  // --------------------------------------------------------
  // EXPORT
  // --------------------------------------------------------
  const exportSec = section("Export");
  const savePngBtn = createButton("Save PNG frame");
  savePngBtn.parent(exportSec);
  savePngBtn.mousePressed(() => saveCanvas("hybrid_poster", "png"));

  handleAnimationState();
}

// ----------------------------------------------------------
// HELPERS
// ----------------------------------------------------------
function systemFont() {
  return "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
}

function applyFormat() {
  const w = int(canvasWidthInput.value());
  const h = int(canvasHeightInput.value());
  if (w > 100 && h > 100) {
    posterWidth = w;
    posterHeight = h;
    resizeCanvas(posterWidth, posterHeight);
    redrawCanvas();
  }
}

function handleAnimationState() {
  if (animateCheckbox.checked()) {
    loop();
  } else {
    noLoop();
    redrawCanvas();
  }
}

function windowResized() {
  // Do not auto-resize poster, user controls format manually now
}

function redrawCanvas() {
  redraw();
}

// ----------------------------------------------------------
// FONT / BG LOADING
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

function handleBgImageFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image")) return;

  loadImage(file.data, img => {
    bgImg = img;
    redrawCanvas();
  });
}

function glyphAdvance(glyph, font, sizePx) {
  const upm = font.unitsPerEm || 1000;
  const aw = glyph.advanceWidth || upm;
  return aw * (sizePx / upm);
}

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
// PATH REPLAY (we control stroke + join)
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
// DRAW ONE HYBRID GLYPH (with outer-only outline)
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

  const pad = outlineWidth > 0 || blurAmount > 0
    ? outlineWidth * 2 + blurAmount + 4
    : 0;

  const ctx = drawingContext;

  const pathA = gA.getPath(xBase + offA, yBase, sizeA);
  const pathB = gB.getPath(xBase + offB, yBase, sizeB);

  function drawHalf(path, rx, ry, rw, rh) {
    // Stroke pass
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

    // Fill pass on top (hides inner stroke)
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

    const leftX = xMin - pad;
    const leftY = yMin - pad;
    const leftW = (splitX - xMin) + pad;
    const leftH = h + 2 * pad;
    drawHalf(pathA, leftX, leftY, leftW, leftH);

    const rightX = splitX;
    const rightY = yMin - pad;
    const rightW = (xMax + pad) - splitX;
    const rightH = h + 2 * pad;
    drawHalf(pathB, rightX, rightY, rightW, rightH);
  } else {
    const splitY = yMax - cutRatio * h;

    const bottomX = xMin - pad;
    const bottomY = splitY;
    const bottomW = (xMax - xMin) + 2 * pad;
    const bottomH = (yMax + pad) - splitY;
    drawHalf(pathB, bottomX, bottomY, bottomW, bottomH);

    const topX = xMin - pad;
    const topY = yMin - pad;
    const topW = (xMax - xMin) + 2 * pad;
    const topH = (splitY - yMin) + pad;
    drawHalf(pathA, topX, topY, topW, topH);
  }
}

// ----------------------------------------------------------
// BACKGROUND DRAWING
// ----------------------------------------------------------
function drawBackground() {
  const mode = bgModeSelect.value();
  if (mode === "image" && bgImg) {
    // cover-fit image
    const canvasRatio = width / height;
    const imgRatio = bgImg.width / bgImg.height;

    let drawW, drawH;
    if (imgRatio > canvasRatio) {
      drawH = height;
      drawW = imgRatio * drawH;
    } else {
      drawW = width;
      drawH = drawW / imgRatio;
    }
    const dx = (width - drawW) / 2;
    const dy = (height - drawH) / 2;

    push();
    image(bgImg, dx, dy, drawW, drawH);
    pop();
  } else if (mode === "gradient") {
    const c1 = color(bgColor1Picker.value());
    const c2 = color(bgColor2Picker.value());
    noStroke();
    for (let y = 0; y < height; y += 3) {
      const t = y / height;
      const c = lerpColor(c1, c2, t);
      fill(c);
      rect(0, y, width, 3);
    }
  } else {
    background(bgColor1Picker.value());
  }
}

// ----------------------------------------------------------
// MAIN DRAW LOOP
// ----------------------------------------------------------
function draw() {
  drawBackground();

  if (!otFontA || !otFontB) {
    push();
    fill(DEFAULT_GREEN);
    textSize(16);
    textFont(systemFont());
    text("Load Font A and Font B to start.", 40, 60);
    pop();
    return;
  }

  const txt = textInput.value();
  const baseSize = sizeSlider.value();
  const tracking = trackingSlider.value();
  const orientation = orientationSelect.value();
  const lineH = lineHeightSlider.value();

  // Animated cut
  let baseCut = cutSlider.value() / 100;
  let cutRatio = baseCut;
  if (animateCheckbox.checked()) {
    const t = millis() * 0.001 * animSpeedSlider.value();
    const amp = animAmplitudeSlider.value();
    const delta = Math.sin(t) * amp;
    cutRatio = constrain(baseCut + delta, 0.0, 1.0);
  }

  const mode = axisModeSelect.value();
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

  // Layout
  let margin = baseSize * 0.4;
  let x = margin;
  let y = baseSize * 1.2;

  if (orientation === "horizontal") {
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];

      if (ch === "\n") {
        x = margin;
        y += baseSize * lineH;
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

      if (x > width - margin - baseSize) {
        x = margin;
        y += baseSize * lineH;
      }
    }
  } else {
    // Vertical text flow: top → bottom, multiple columns
    x = margin;
    y = margin + baseSize;

    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];

      if (ch === "\n") {
        // new column on manual line break
        x += baseSize * 1.1;
        y = margin + baseSize;
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

      y += baseSize * lineH;

      if (y > height - margin) {
        y = margin + baseSize;
        x += baseSize * 1.1;
      }
    }
  }
}