// ----------------------------------------------------------
// HYBRID FONT POSTER TOOL - ZOOM + HEX COLORS + SIDE SWAP
// p5.js + opentype.js
// ----------------------------------------------------------

let otFontA = null;
let otFontB = null;

// UI globals
let textInput;
let sizeSlider, trackingSlider;
let axisModeSelect, cutSlider, cutLabel;
let fontAStatusP, fontBStatusP;
let scaleASlider, offsetASlider, scaleBSlider, offsetBSlider;
let fillPicker, outlinePicker;
let outlineWidthSlider, outlineRoundSlider, outlineBlurSlider;

let canvasWidthInput, canvasHeightInput, applyFormatButton;
let lineHeightSlider, orientationSelect, alignSelect;
let zoomSlider;

let bgModeSelect, bgColor1Picker, bgColor2Picker, bgImageInput;
let bgImg = null;

let animateCheckbox, animSpeedSlider, animAmplitudeSlider;
let alternateSideCheckbox, alternateSideSpeedSlider;

let posterWidth, posterHeight;

const DEFAULT_GREEN = "#1f6a3a";

// ----------------------------------------------------------
// SETUP
// ----------------------------------------------------------
function setup() {
  posterWidth = windowWidth * 0.7;
  posterHeight = windowHeight - 20;

  // Main layout: left UI, right canvas
  const main = createDiv();
  main.style("display", "flex");
  main.style("flex-direction", "row");
  main.style("align-items", "flex-start");
  main.style("margin", "0");
  main.style("padding", "0");

  // Left sidebar UI
  const ui = createDiv();
  ui.parent(main);
  ui.style("padding", "8px");
  ui.style("width", "360px");
  ui.style("box-sizing", "border-box");
  ui.style("font-family", systemFont());
  ui.style("font-size", "12px");
  ui.style("color", DEFAULT_GREEN);
  ui.style("background", "#ffffff");
  ui.style("display", "flex");
  ui.style("flex-direction", "column");
  ui.style("gap", "16px");
  ui.style("border-right", "1px solid #dddddd");

  // Canvas holder
  const canvasHolder = createDiv();
  canvasHolder.parent(main);
  canvasHolder.style("flex", "1 1 auto");
  canvasHolder.style("display", "flex");
  canvasHolder.style("align-items", "center");
  canvasHolder.style("justify-content", "center");
  canvasHolder.style("background", "#f5f5f5");

  const cnv = createCanvas(posterWidth, posterHeight);
  cnv.parent(canvasHolder);
  noLoop();

  function section(title) {
    const s = createDiv();
    s.parent(ui);
    s.style("display", "flex");
    s.style("flex-direction", "column");
    s.style("gap", "4px");
    s.style("padding", "6px 0");
    s.style("border-bottom", "1px solid #e0e0e0");

    const h = createElement("h2", title);
    h.parent(s);
    h.style("margin", "0 0 4px 0");
    h.style("font-size", "13px");
    h.style("text-transform", "uppercase");
    h.style("letter-spacing", "0.08em");
    h.style("color", DEFAULT_GREEN);

    return s;
  }

  // ----------------- FORMAT / POSTER SECTION -----------------
  const formatSec = section("Poster format");

  const formatRow = createDiv();
  formatRow.parent(formatSec);
  formatRow.style("display", "flex");
  formatRow.style("gap", "6px");
  formatRow.style("align-items", "center");
  formatRow.child(createSpan("Size"));

  const wLabel = createSpan("W");
  wLabel.parent(formatRow);
  canvasWidthInput = createInput(int(posterWidth).toString());
  canvasWidthInput.parent(formatRow);
  canvasWidthInput.attribute("type", "number");
  canvasWidthInput.style("width", "70px");

  const hLabel = createSpan("H");
  hLabel.parent(formatRow);
  canvasHeightInput = createInput(int(posterHeight).toString());
  canvasHeightInput.parent(formatRow);
  canvasHeightInput.attribute("type", "number");
  canvasHeightInput.style("width", "70px");

  applyFormatButton = createButton("Apply");
  applyFormatButton.parent(formatSec);
  applyFormatButton.mousePressed(applyFormat);

  // Orientation and alignment
  const orientRow = createDiv();
  orientRow.parent(formatSec);
  orientRow.style("display", "flex");
  orientRow.style("gap", "6px");
  orientRow.style("align-items", "center");
  orientRow.child(createSpan("Orientation"));

  orientationSelect = createSelect();
  orientationSelect.parent(orientRow);
  orientationSelect.option("Horizontal", "horizontal");
  orientationSelect.option("Vertical", "vertical");
  orientationSelect.changed(redrawCanvas);

  const alignRow = createDiv();
  alignRow.parent(formatSec);
  alignRow.style("display", "flex");
  alignRow.style("gap", "6px");
  alignRow.style("align-items", "center");
  alignRow.child(createSpan("Align"));

  alignSelect = createSelect();
  alignSelect.parent(alignRow);
  alignSelect.option("Left", "left");
  alignSelect.option("Center", "center");
  alignSelect.option("Right", "right");
  alignSelect.changed(redrawCanvas);

  formatSec.child(createSpan("Line height (can be negative)"));
  lineHeightSlider = createSlider(-1.5, 3.0, 1.4, 0.05);
  lineHeightSlider.parent(formatSec);
  lineHeightSlider.input(redrawCanvas);

  formatSec.child(createSpan("Zoom (0.25 - 3)"));
  zoomSlider = createSlider(0.25, 3.0, 1.0, 0.01);
  zoomSlider.parent(formatSec);
  zoomSlider.input(redrawCanvas);

  // ----------------- FONT SECTION -----------------
  const fontsSec = section("Fonts");

  fontsSec.child(createSpan("Font A"));
  const fontAInput = createFileInput(f => handleFontFile(f, "A"));
  fontAInput.parent(fontsSec);

  fontsSec.child(createSpan("Font B"));
  const fontBInput = createFileInput(f => handleFontFile(f, "B"));
  fontBInput.parent(fontsSec);

  fontAStatusP = createP("Font A: none");
  fontAStatusP.parent(fontsSec);
  fontAStatusP.style("margin", "4px 0 0 0");

  fontBStatusP = createP("Font B: none");
  fontBStatusP.parent(fontsSec);
  fontBStatusP.style("margin", "2px 0 0 0");

  const hint = createP(
    "Hybrid per glyph: left/top from A, right/bottom from B. Combine with layout, background, animation."
  );
  hint.parent(fontsSec);
  hint.style("margin", "6px 0 0 0");
  hint.style("font-size", "11px");

  // ----------------- TEXT SECTION -----------------
  const textSec = section("Text");

  textSec.child(createSpan("Text (paragraphs, Enter for new lines)"));

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

  textSec.child(createSpan("Base font size"));
  sizeSlider = createSlider(32, 400, 200, 1);
  sizeSlider.parent(textSec);
  sizeSlider.input(redrawCanvas);

  textSec.child(createSpan("Tracking (letter spacing)"));
  trackingSlider = createSlider(-40, 120, 10, 1);
  trackingSlider.parent(textSec);
  trackingSlider.input(redrawCanvas);

  // ----------------- SPLIT SECTION -----------------
  const splitSec = section("Split inside glyph");

  const modeRow = createDiv();
  modeRow.parent(splitSec);
  modeRow.style("display", "flex");
  modeRow.style("gap", "6px");
  modeRow.style("align-items", "center");
  modeRow.child(createSpan("Mode"));

  axisModeSelect = createSelect();
  axisModeSelect.parent(modeRow);
  axisModeSelect.option("Vertical (left/right)", "vertical");
  axisModeSelect.option("Horizontal (top/bottom)", "horizontal");
  axisModeSelect.changed(redrawCanvas);

  cutLabel = createSpan("Cut position (0 = left, 100 = right)");
  cutLabel.parent(splitSec);

  cutSlider = createSlider(0, 100, 50, 1);
  cutSlider.parent(splitSec);
  cutSlider.input(redrawCanvas);

  // ----------------- FONT TRANSFORMS -----------------
  const transASec = section("Font A transform");
  transASec.child(createSpan("Size A (50 - 150 %)"));
  scaleASlider = createSlider(50, 150, 100, 1);
  scaleASlider.parent(transASec);
  scaleASlider.input(redrawCanvas);

  transASec.child(createSpan("Horizontal offset A (-30 % .. +30 % base size)"));
  offsetASlider = createSlider(-30, 30, 0, 1);
  offsetASlider.parent(transASec);
  offsetASlider.input(redrawCanvas);

  const transBSec = section("Font B transform");
  transBSec.child(createSpan("Size B (50 - 150 %)"));
  scaleBSlider = createSlider(50, 150, 100, 1);
  scaleBSlider.parent(transBSec);
  scaleBSlider.input(redrawCanvas);

  transBSec.child(createSpan("Horizontal offset B (-30 % .. +30 % base size)"));
  offsetBSlider = createSlider(-30, 30, 0, 1);
  offsetBSlider.parent(transBSec);
  offsetBSlider.input(redrawCanvas);

  // ----------------- STYLING (FILL + OUTLINE) -----------------
  const styleSec = section("Styling");

  const fillControl = addColorControl(styleSec, "Fill", DEFAULT_GREEN, redrawCanvas);
  fillPicker = fillControl.picker;

  const outlineControl = addColorControl(styleSec, "Outline", "#000000", redrawCanvas);
  outlinePicker = outlineControl.picker;

  styleSec.child(createSpan("Outline thickness (0 - 40 px)"));
  outlineWidthSlider = createSlider(0, 40, 6, 1);
  outlineWidthSlider.parent(styleSec);
  outlineWidthSlider.input(redrawCanvas);

  styleSec.child(createSpan("Corner roundness (0 sharp - 1 bevel - 2 round)"));
  outlineRoundSlider = createSlider(0, 2, 2, 1);
  outlineRoundSlider.parent(styleSec);
  outlineRoundSlider.input(redrawCanvas);

  styleSec.child(createSpan("Outline blurriness / glow (0 - 20)"));
  outlineBlurSlider = createSlider(0, 20, 0, 1);
  outlineBlurSlider.parent(styleSec);
  outlineBlurSlider.input(redrawCanvas);

  // ----------------- BACKGROUND SECTION -----------------
  const bgSec = section("Background");

  const bgModeRow = createDiv();
  bgModeRow.parent(bgSec);
  bgModeRow.style("display", "flex");
  bgModeRow.style("gap", "6px");
  bgModeRow.style("align-items", "center");
  bgModeRow.child(createSpan("Mode"));

  bgModeSelect = createSelect();
  bgModeSelect.parent(bgModeRow);
  bgModeSelect.option("Solid color", "solid");
  bgModeSelect.option("Vertical gradient", "gradient");
  bgModeSelect.option("Image", "image");
  bgModeSelect.changed(redrawCanvas);

  const bg1Control = addColorControl(bgSec, "Color 1", "#ffffff", redrawCanvas);
  bgColor1Picker = bg1Control.picker;

  const bg2Control = addColorControl(bgSec, "Color 2", "#cccccc", redrawCanvas);
  bgColor2Picker = bg2Control.picker;

  bgSec.child(createSpan("Background image"));
  bgImageInput = createFileInput(handleBgImageFile);
  bgImageInput.parent(bgSec);

  // ----------------- ANIMATION SECTION -----------------
  const animSec = section("Animation");

  animateCheckbox = createCheckbox("Animate cut", false);
  animateCheckbox.parent(animSec);
  animateCheckbox.changed(handleAnimationState);

  animSec.child(createSpan("Cut speed"));
  animSpeedSlider = createSlider(0.1, 3.0, 1.0, 0.05);
  animSpeedSlider.parent(animSec);
  animSpeedSlider.input(redrawCanvas);

  animSec.child(createSpan("Cut amplitude (0 - 0.5)"));
  animAmplitudeSlider = createSlider(0.0, 0.5, 0.15, 0.01);
  animAmplitudeSlider.parent(animSec);
  animAmplitudeSlider.input(redrawCanvas);

  alternateSideCheckbox = createCheckbox("Alternate font side", false);
  alternateSideCheckbox.parent(animSec);
  alternateSideCheckbox.changed(handleAnimationState);

  animSec.child(createSpan("Side swap speed"));
  alternateSideSpeedSlider = createSlider(0.1, 5.0, 1.0, 0.05);
  alternateSideSpeedSlider.parent(animSec);
  alternateSideSpeedSlider.input(redrawCanvas);

  // ----------------- EXPORT -----------------
  const exportSec = section("Export");
  const savePngBtn = createButton("Save PNG frame");
  savePngBtn.parent(exportSec);
  savePngBtn.mousePressed(() => saveCanvas("hybrid_poster", "png"));

  handleAnimationState();
}

// ----------------------------------------------------------
// UI HELPERS
// ----------------------------------------------------------
function systemFont() {
  return "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
}

// color picker + hex text input
function addColorControl(parent, labelText, defaultColor, onChange) {
  const row = createDiv();
  row.parent(parent);
  row.style("display", "flex");
  row.style("gap", "4px");
  row.style("align-items", "center");

  const label = createSpan(labelText);
  label.parent(row);

  const picker = createColorPicker(defaultColor);
  picker.parent(row);

  const hexInput = createInput(defaultColor);
  hexInput.parent(row);
  hexInput.style("width", "70px");
  hexInput.attribute("maxlength", "7");

  picker.input(() => {
    hexInput.value(picker.value());
    if (onChange) onChange();
  });

  hexInput.input(() => {
    let v = hexInput.value().trim();
    if (v[0] !== "#") v = "#" + v;
    const ok = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v);
    if (ok) {
      picker.value(v);
      if (onChange) onChange();
    }
  });

  return { picker, hexInput };
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
  if ((animateCheckbox && animateCheckbox.checked()) ||
      (alternateSideCheckbox && alternateSideCheckbox.checked())) {
    loop();
  } else {
    noLoop();
    redrawCanvas();
  }
}

function windowResized() {
  // format is manual
}

function redrawCanvas() {
  redraw();
}

// ----------------------------------------------------------
// FONT / BACKGROUND LOADING
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
// PATH REPLAY
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
// DRAW ONE HYBRID GLYPH (outer-only outline) with side swap
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
  blurAmount,
  swapSides
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
    // stroke first
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

    // fill on top
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

    const rightX = splitX;
    const rightY = yMin - pad;
    const rightW = (xMax + pad) - splitX;
    const rightH = h + 2 * pad;

    if (!swapSides) {
      // A left, B right
      drawHalf(pathA, leftX, leftY, leftW, leftH);
      drawHalf(pathB, rightX, rightY, rightW, rightH);
    } else {
      // B left, A right
      drawHalf(pathB, leftX, leftY, leftW, leftH);
      drawHalf(pathA, rightX, rightY, rightW, rightH);
    }
  } else {
    const splitY = yMax - cutRatio * h;

    const bottomX = xMin - pad;
    const bottomY = splitY;
    const bottomW = (xMax - xMin) + 2 * pad;
    const bottomH = (yMax + pad) - splitY;

    const topX = xMin - pad;
    const topY = yMin - pad;
    const topW = (xMax - xMin) + 2 * pad;
    const topH = (splitY - yMin) + pad;

    if (!swapSides) {
      // B bottom, A top
      drawHalf(pathB, bottomX, bottomY, bottomW, bottomH);
      drawHalf(pathA, topX, topY, topW, topH);
    } else {
      // A bottom, B top
      drawHalf(pathA, bottomX, bottomY, bottomW, bottomH);
      drawHalf(pathB, topX, topY, topW, topH);
    }
  }
}

// ----------------------------------------------------------
// BACKGROUND
// ----------------------------------------------------------
function drawBackground() {
  const mode = bgModeSelect.value();
  if (mode === "image" && bgImg) {
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
    noStroke();
    fill(bgColor1Picker.value());
    rect(0, 0, width, height);
  }
}

// ----------------------------------------------------------
// LINE SHAPING FOR HORIZONTAL TEXT (ALIGNMENT)
// ----------------------------------------------------------
function shapeLinesHorizontal(txt, baseSize, tracking, margin) {
  const lines = [];
  let current = "";
  let currentWidth = 0;
  const maxWidth = width - margin * 2;

  function pushLine() {
    lines.push({ text: current, width: currentWidth });
    current = "";
    currentWidth = 0;
  }

  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];

    if (ch === "\n") {
      pushLine();
      continue;
    }

    const gA = otFontA.charToGlyph(ch);
    const gB = otFontB.charToGlyph(ch);
    if (!gA || !gB) continue;

    const advA = glyphAdvance(gA, otFontA, baseSize);
    const advB = glyphAdvance(gB, otFontB, baseSize);
    const adv = (advA + advB) * 0.5;

    if (current.length === 0) {
      if (adv > maxWidth) {
        current = ch;
        currentWidth = adv;
        pushLine();
      } else {
        current = ch;
        currentWidth = adv;
      }
    } else {
      const widthNeeded = currentWidth + tracking + adv;
      if (widthNeeded > maxWidth) {
        pushLine();
        current = ch;
        currentWidth = adv;
      } else {
        current += ch;
        currentWidth = widthNeeded;
      }
    }
  }

  if (current.length > 0) {
    pushLine();
  }

  return lines;
}

// ----------------------------------------------------------
// MAIN DRAW
// ----------------------------------------------------------
function draw() {
  clear();

  const z = zoomSlider ? zoomSlider.value() : 1;
  push();
  translate(width / 2, height / 2);
  scale(z);
  translate(-width / 2, -height / 2);

  drawBackground();

  if (!otFontA || !otFontB) {
    push();
    fill(DEFAULT_GREEN);
    textSize(16);
    textFont(systemFont());
    text("Load Font A and Font B to start.", 40, 60);
    pop();
    pop();
    return;
  }

  const txt = textInput.value();
  const baseSize = sizeSlider.value();
  const tracking = trackingSlider.value();
  const orientation = orientationSelect.value();
  const alignMode = alignSelect.value();
  const lineH = lineHeightSlider.value();

  // Animated cut
  let baseCut = cutSlider.value() / 100;
  let cutRatio = baseCut;
  if (animateCheckbox && animateCheckbox.checked()) {
    const t = millis() * 0.001 * animSpeedSlider.value();
    const amp = animAmplitudeSlider.value();
    const delta = Math.sin(t) * amp;
    cutRatio = constrain(baseCut + delta, 0.0, 1.0);
  }

  // Animated font side swap
  let swapSidesGlobal = false;
  if (alternateSideCheckbox && alternateSideCheckbox.checked()) {
    const t2 = millis() * 0.001 * alternateSideSpeedSlider.value();
    swapSidesGlobal = Math.sin(t2) > 0;
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

  const margin = baseSize * 0.4;

  if (orientation === "horizontal") {
    const shaped = shapeLinesHorizontal(txt, baseSize, tracking, margin);
    let y = baseSize * 1.2;

    for (let li = 0; li < shaped.length; li++) {
      const line = shaped[li];
      let x;
      const maxWidth = width - 2 * margin;

      if (alignMode === "left") {
        x = margin;
      } else if (alignMode === "center") {
        x = margin + (maxWidth - line.width) / 2;
      } else {
        x = margin + (maxWidth - line.width);
      }

      for (let ci = 0; ci < line.text.length; ci++) {
        const ch = line.text[ci];
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
          blurAmount,
          swapSidesGlobal
        );

        const advA = glyphAdvance(gA, otFontA, baseSize);
        const advB = glyphAdvance(gB, otFontB, baseSize);
        const adv = (advA + advB) * 0.5;

        x += adv + tracking;
      }

      y += baseSize * lineH;
    }
  } else {
    // vertical text flow
    let xStart;
    if (alignMode === "left") {
      xStart = baseSize * 0.6;
    } else if (alignMode === "center") {
      xStart = width / 2;
    } else {
      xStart = width - baseSize * 1.6;
    }

    let x = xStart;
    let y = baseSize * 1.2;

    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];

      if (ch === "\n") {
        x += baseSize * 1.1;
        y = baseSize * 1.2;
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
        blurAmount,
        swapSidesGlobal
      );

      y += baseSize * lineH;

      if (y > height - baseSize) {
        y = baseSize * 1.2;
        x += baseSize * 1.1;
      }
    }
  }

  pop(); // zoom transform
}