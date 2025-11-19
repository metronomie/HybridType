// ----------------------------------------------------------
// HYBRID FONT POSTER TOOL
// Default page: 1080 x 1920
// Default align: center
// Default bg + fill: #00f900
// Default outline color: #feffff, thickness: 40px
// Zoom, split, outline
// Font A/B hybrid, transforms
// Layout, negative line height (horizontal text)
// Animation: side flip, rotation
// Audio reactive: rotate sides from tempo-ish peaks
// Orientation = page format ONLY (horizontal/vertical), NOT text direction
// Quarters split mode (A/B/A/B) with audio beat rotation only
// Per-line size / line-height / tracking overrides
// Background: solid, gradient, image, or VIDEO in random squares
// Video: random squares + invert toggle, updated on every 2nd beat
// ----------------------------------------------------------

// opentype + p5.sound must be loaded in index.html

let otFontA = null;
let otFontB = null;

// default font buffers loaded in preload
let defaultFontABuffer = null;
let defaultFontBBuffer = null;

// audio
let audio = null;
let amplitudeAnalyzer = null;
let audioPlayButton;
let audioBeatCheckbox;
let audioSensitivitySlider;
let lastAudioLevel = 0;
let swapSidesBeat = false;
let sideModeBeat = 0;
// beat tracking helpers
let avgLevel = 0;
let lastBeatTime = 0;

// UI globals
let textInput;
let sizeSlider, trackingSlider;
let axisModeSelect, cutSlider, cutLabel;
let fontAStatusP, fontBStatusP;
let scaleASlider, offsetASlider;
let scaleBSlider, offsetBSlider;
let fillPicker, outlinePicker;
let outlineWidthSlider, outlineRoundSlider, outlineBlurSlider;

let canvasWidthInput, canvasHeightInput, applyFormatButton;
let lineHeightSlider, orientationSelect, alignSelect;
let zoomSlider;

let bgModeSelect, bgColor1Picker, bgColor2Picker, bgImageInput;
let bgImg = null;
let bgVideo = null;
let bgVideoInput = null;

let animateCheckbox; // (unused but kept if referenced)
let alternateSideCheckbox, alternateSideSpeedSlider;
let rotateSidesCheckbox, rotateSidesSpeedSlider;

let posterWidth, posterHeight;

const DEFAULT_UI_GREEN = "#1f6a3a";

// per-line settings
let lineSettings = []; // [{sizeFactor, lineHeightFactor, trackingDelta}, ...]
let lineSettingsContainer;

// video tiles + beat-slowed motion
let videoTiles = [];          // [{x,y,w,h}, ...]
let videoBeatCounter = 0;     // counts detected beats
let videoTileNeedsUpdate = false;
let videoInvert = false;      // whether to invert video bg this "slow beat"

// ----------------------------------------------------------
// PRELOAD
// ----------------------------------------------------------
function preload() {
  defaultFontABuffer = loadBytes("Fonts/Baskerville120Pro.otf");
  defaultFontBBuffer = loadBytes("Fonts/ESAllianzExtraBold.ttf");

  soundFormats("mp3", "wav", "ogg");
  audio = loadSound("Music/Eliminator_The Hunt_01.wav", () => {
    amplitudeAnalyzer = new p5.Amplitude();
    amplitudeAnalyzer.setInput(audio);
  });
}

// ----------------------------------------------------------
// SETUP
// ----------------------------------------------------------
function setup() {
  posterWidth = 1080;
  posterHeight = 1560;

  const main = createDiv();
  main.style("display", "flex");
  main.style("flex-direction", "row");
  main.style("align-items", "flex-start");
  main.style("margin", "0");
  main.style("padding", "0");

  const ui = createDiv();
  ui.parent(main);
  ui.style("padding", "8px");
  ui.style("width", "360px");
  ui.style("box-sizing", "border-box");
  ui.style("font-family", systemFont());
  ui.style("font-size", "12px");
  ui.style("color", DEFAULT_UI_GREEN);
  ui.style("background", "#ffffff");
  ui.style("display", "flex");
  ui.style("flex-direction", "column");
  ui.style("gap", "16px");
  ui.style("border-right", "1px solid #dddddd");
  ui.style("height", "100vh");
  ui.style("overflow-y", "auto");

  const canvasHolder = createDiv();
  canvasHolder.parent(main);
  canvasHolder.style("flex", "1 1 auto");
  canvasHolder.style("display", "flex");
  canvasHolder.style("align-items", "center");
  canvasHolder.style("justify-content", "center");
  canvasHolder.style("background", "#f5f5f5");
  canvasHolder.style("overflow", "auto");     // scroll poster
  canvasHolder.style("max-height", "100vh");  // stay in viewport

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
    s.style("border-bottom", "1px solid " + "#e0e0e0");

    const h = createElement("h2", title);
    h.parent(s);
    h.style("margin", "0 0 4px 0");
    h.style("font-size", "13px");
    h.style("text-transform", "uppercase");
    h.style("letter-spacing", "0.08em");
    h.style("color", DEFAULT_UI_GREEN);

    return s;
  }

  // FORMAT
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
  orientationSelect.selected("vertical");
  orientationSelect.changed(onOrientationChange); // page format only

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
  alignSelect.selected("center");
  alignSelect.changed(redrawCanvas);

  formatSec.child(createSpan("Line height (can be negative)"));
  lineHeightSlider = createSlider(-1.5, 3.0, 0.9, 0.05);
  lineHeightSlider.parent(formatSec);
  lineHeightSlider.input(redrawCanvas);

  formatSec.child(createSpan("Zoom (0.25 - 3)"));
  zoomSlider = createSlider(0.25, 3.0, 1.0, 0.01);
  zoomSlider.parent(formatSec);
  zoomSlider.input(redrawCanvas);

  // FONTS
  const fontsSec = section("Fonts");

  fontsSec.child(createSpan("Font A"));
  const fontAInput = createFileInput(f => handleFontFile(f, "A"));
  fontAInput.parent(fontsSec);

  fontsSec.child(createSpan("Font B"));
  const fontBInput = createFileInput(f => handleFontFile(f, "B"));
  fontBInput.parent(fontsSec);

  fontAStatusP = createP("Font A: loading default...");
  fontAStatusP.parent(fontsSec);
  fontAStatusP.style("margin", "4px 0 0 0");

  fontBStatusP = createP("Font B: loading default...");
  fontBStatusP.parent(fontsSec);
  fontBStatusP.style("margin", "2px 0 0 0");

  const hint = createP(
    "Hybrid per glyph: left/top from A, right/bottom from B. Quarters = A/B/A/B, rotated by beat."
  );
  hint.parent(fontsSec);
  hint.style("margin", "6px 0 0 0");
  hint.style("font-size", "11px");

  try {
    if (defaultFontABuffer && defaultFontABuffer.bytes) {
      otFontA = opentype.parse(defaultFontABuffer.bytes.buffer);
      fontAStatusP.html("Font A: Baskerville120Pro.otf (default)");
    } else {
      fontAStatusP.html("Font A: none (default failed)");
    }
  } catch (e) {
    console.error("Error loading default Font A:", e);
    fontAStatusP.html("Font A: error loading default");
  }

  try {
    if (defaultFontBBuffer && defaultFontBBuffer.bytes) {
      otFontB = opentype.parse(defaultFontBBuffer.bytes.buffer);
      fontBStatusP.html("Font B: ESAllianzExtraBold.ttf (default)");
    } else {
      fontBStatusP.html("Font B: none (default failed)");
    }
  } catch (e) {
    console.error("Error loading default Font B:", e);
    fontBStatusP.html("Font B: error loading default");
  }

  // TEXT
  const textSec = section("Text");

  textSec.child(createSpan("Text (paragraphs, Enter for new lines)"));

  textInput = createElement("textarea");
  textInput.parent(textSec);
  textInput.style("width", "100%");
  textInput.style("height", "120px");
  textInput.style("padding", "4px 6px");
  textInput.style("border-radius", "4px");
  textInput.style("border", "1px solid " + DEFAULT_UI_GREEN);
  textInput.style("resize", "vertical");
  textInput.value("ALL\nCAPS\n1312");
  textInput.input(() => {
    updateLineSettingsUI();
    redrawCanvas();
  });

  textSec.child(createSpan("Base font size"));
  sizeSlider = createSlider(32, 400, 200, 1);
  sizeSlider.parent(textSec);
  sizeSlider.input(redrawCanvas);

  textSec.child(createSpan("Base tracking (letter spacing)"));
  trackingSlider = createSlider(-40, 120, 10, 1);
  trackingSlider.parent(textSec);
  trackingSlider.input(redrawCanvas);

  const perLineLabel = createSpan("Per-line overrides: size %, line-height %, Δtracking");
  perLineLabel.parent(textSec);
  perLineLabel.style("margin-top", "4px");
  perLineLabel.style("font-size", "11px");

  lineSettingsContainer = createDiv();
  lineSettingsContainer.parent(textSec);
  lineSettingsContainer.style("display", "flex");
  lineSettingsContainer.style("flex-direction", "column");
  lineSettingsContainer.style("gap", "2px");
  lineSettingsContainer.style("border", "1px dashed #cccccc");
  lineSettingsContainer.style("padding", "4px");
  updateLineSettingsUI();

  // SPLIT
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
  axisModeSelect.option("Quarters (A/B/A/B)", "quarters");
  axisModeSelect.selected("vertical");
  axisModeSelect.changed(redrawCanvas);

  cutLabel = createSpan("Cut position (0 = left, 100 = right)");
  cutLabel.parent(splitSec);

  cutSlider = createSlider(0, 100, 50, 1);
  cutSlider.parent(splitSec);
  cutSlider.input(redrawCanvas);

  // FONT TRANSFORMS
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

  // STYLING
  const styleSec = section("Styling");

  const fillControl = addColorControl(styleSec, "Fill", "#00f900", redrawCanvas);
  fillPicker = fillControl.picker;

  const outlineControl = addColorControl(styleSec, "Outline", "#feffff", redrawCanvas);
  outlinePicker = outlineControl.picker;

  styleSec.child(createSpan("Outline thickness (0 - 40 px)"));
  outlineWidthSlider = createSlider(0, 40, 40, 1);
  outlineWidthSlider.parent(styleSec);
  outlineWidthSlider.input(redrawCanvas);

  styleSec.child(createSpan("Corner roundness (0 sharp - 1 bevel - 2 round)"));
  outlineRoundSlider = createSlider(0, 2, 2, 1);
  outlineRoundSlider.parent(styleSec);
  outlineRoundSlider.input(redrawCanvas);

  styleSec.child(createSpan("Outline blurriness / glow (0 - 40)"));
  outlineBlurSlider = createSlider(0, 40, 10, 1);
  outlineBlurSlider.parent(styleSec);
  outlineBlurSlider.input(redrawCanvas);

  // BACKGROUND
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
  bgModeSelect.option("Video", "video");
  bgModeSelect.selected("solid");
  bgModeSelect.changed(redrawCanvas);

  const bg1Control = addColorControl(bgSec, "Color 1", "#00f900", redrawCanvas);
  bgColor1Picker = bg1Control.picker;

  const bg2Control = addColorControl(bgSec, "Color 2", "#cccccc", redrawCanvas);
  bgColor2Picker = bg2Control.picker;

  bgSec.child(createSpan("Background image"));
  bgImageInput = createFileInput(handleBgImageFile);
  bgImageInput.parent(bgSec);

  bgSec.child(createSpan("Background video"));
  bgVideoInput = createFileInput(handleBgVideoFile);
  bgVideoInput.parent(bgSec);

  // ANIMATION (no cut animation)
  const animSec = section("Animation");

  alternateSideCheckbox = createCheckbox("Alternate font side (flip A/B)", false);
  alternateSideCheckbox.parent(animSec);
  alternateSideCheckbox.changed(handleAnimationState);

  animSec.child(createSpan("Side flip speed"));
  alternateSideSpeedSlider = createSlider(0.1, 5.0, 1.0, 0.05);
  alternateSideSpeedSlider.parent(animSec);
  alternateSideSpeedSlider.input(redrawCanvas);

  rotateSidesCheckbox = createCheckbox("Rotate sides (L -> T -> R -> L)", false);
  rotateSidesCheckbox.parent(animSec);
  rotateSidesCheckbox.changed(handleAnimationState);

  animSec.child(createSpan("Rotate speed"));
  rotateSidesSpeedSlider = createSlider(0.1, 5.0, 1.0, 0.05);
  rotateSidesSpeedSlider.parent(animSec);
  rotateSidesSpeedSlider.input(redrawCanvas);

  // AUDIO
  const audioSec = section("Audio / Beat");
  audioSec.child(createSpan("Default: Music/Eliminator_The Hunt_01.wav"));

  const audioFileRow = createDiv();
  audioFileRow.parent(audioSec);
  audioFileRow.style("display", "flex");
  audioFileRow.style("gap", "4px");
  audioFileRow.style("align-items", "center");

  audioFileRow.child(createSpan("Audio track"));
  const audioFileInput = createFileInput(handleAudioFile);
  audioFileInput.parent(audioFileRow);

  audioPlayButton = createButton("Play audio");
  audioPlayButton.parent(audioSec);
  audioPlayButton.mousePressed(toggleAudio);

  audioBeatCheckbox = createCheckbox("Drive animation from audio beat (rotation + video)", false);
  audioBeatCheckbox.parent(audioSec);
  audioBeatCheckbox.changed(handleAnimationState);

  audioSec.child(createSpan("Beat sensitivity"));
  audioSensitivitySlider = createSlider(0.0, 1.0, 0.5, 0.01);
  audioSensitivitySlider.parent(audioSec);
  audioSensitivitySlider.input(redrawCanvas);

  // EXPORT
  const exportSec = section("Export");
  const savePngBtn = createButton("Save PNG frame");
  savePngBtn.parent(exportSec);
  savePngBtn.mousePressed(() => saveCanvas("hybrid_poster", "png"));

  handleAnimationState();
}

// ----------------------------------------------------------
// PER-LINE SETTINGS
// ----------------------------------------------------------
function ensureLineSettings(n) {
  while (lineSettings.length < n) {
    lineSettings.push({
      sizeFactor: 1.0,
      lineHeightFactor: 1.0,
      trackingDelta: 0
    });
  }
  if (lineSettings.length > n) {
    lineSettings.length = n;
  }
}

function updateLineSettingsUI() {
  if (!textInput || !lineSettingsContainer) return;
  const lines = textInput.value().split("\n");
  ensureLineSettings(lines.length);

  lineSettingsContainer.html("");

  for (let i = 0; i < lines.length; i++) {
    const row = createDiv();
    row.parent(lineSettingsContainer);
    row.style("display", "flex");
    row.style("gap", "4px");
    row.style("align-items", "center");

    const label = createSpan("L" + (i + 1));
    label.parent(row);
    label.style("width", "22px");

    const sizeInput = createInput((lineSettings[i].sizeFactor * 100).toFixed(0));
    sizeInput.parent(row);
    sizeInput.attribute("type", "number");
    sizeInput.style("width", "45px");
    const sizeLabel = createSpan("%");
    sizeLabel.parent(row);

    const lhInput = createInput((lineSettings[i].lineHeightFactor * 100).toFixed(0));
    lhInput.parent(row);
    lhInput.attribute("type", "number");
    lhInput.style("width", "45px");
    const lhLabel = createSpan("% LH");
    lhLabel.parent(row);

    const trackInput = createInput(lineSettings[i].trackingDelta.toFixed(0));
    trackInput.parent(row);
    trackInput.attribute("type", "number");
    trackInput.style("width", "55px");
    const trackLabel = createSpan("Δtrk");
    trackLabel.parent(row);

    sizeInput.input(() => {
      let v = float(sizeInput.value());
      if (!isNaN(v)) {
        lineSettings[i].sizeFactor = constrain(v / 100, 0.2, 5.0);
        redrawCanvas();
      }
    });

    lhInput.input(() => {
      let v = float(lhInput.value());
      if (!isNaN(v)) {
        lineSettings[i].lineHeightFactor = constrain(v / 100, 0.2, 5.0);
        redrawCanvas();
      }
    });

    trackInput.input(() => {
      let v = float(trackInput.value());
      if (!isNaN(v)) {
        lineSettings[i].trackingDelta = constrain(v, -200, 200);
        redrawCanvas();
      }
    });
  }
}

// ----------------------------------------------------------
// UI HELPERS
// ----------------------------------------------------------
function systemFont() {
  return "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
}

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

// orientation = page format only (swap w/h if needed)
function onOrientationChange() {
  const val = orientationSelect.value();
  let w = posterWidth;
  let h = posterHeight;

  if (val === "horizontal" && h > w) {
    const tmp = w; w = h; h = tmp;
  } else if (val === "vertical" && w > h) {
    const tmp = w; w = h; h = tmp;
  }

  posterWidth = w;
  posterHeight = h;
  resizeCanvas(posterWidth, posterHeight);
  canvasWidthInput.value(posterWidth.toString());
  canvasHeightInput.value(posterHeight.toString());
  redrawCanvas();
}

function handleAnimationState() {
  const anyAnim =
    (alternateSideCheckbox && alternateSideCheckbox.checked()) ||
    (rotateSidesCheckbox && rotateSidesCheckbox.checked()) ||
    (audioBeatCheckbox && audioBeatCheckbox.checked());

  if (anyAnim) {
    loop();
  } else {
    noLoop();
    redrawCanvas();
  }
}

function windowResized() {}

function redrawCanvas() {
  redraw();
}

// ----------------------------------------------------------
// AUDIO HELPERS
// ----------------------------------------------------------
function toggleAudio() {
  if (!audio) return;
  if (audio.isPlaying()) {
    audio.pause();
    audioPlayButton.html("Play audio");
  } else {
    audio.loop();
    audioPlayButton.html("Pause audio");
    if (!amplitudeAnalyzer) {
      amplitudeAnalyzer = new p5.Amplitude();
      amplitudeAnalyzer.setInput(audio);
    }
  }
}

function handleAudioFile(file) {
  if (!file || !file.type.startsWith("audio")) return;
  if (audio) {
    audio.stop();
  }
  audio = loadSound(file.data, () => {
    if (!amplitudeAnalyzer) {
      amplitudeAnalyzer = new p5.Amplitude();
    }
    amplitudeAnalyzer.setInput(audio);
    audioPlayButton.html("Play audio");
  });
}

// ----------------------------------------------------------
// FONT / BACKGROUND FILE HANDLERS
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
    bgVideo = null; // prefer image if both exist
    redrawCanvas();
  });
}

function handleBgVideoFile(file) {
  if (!file) return;
  if (!file.type.startsWith("video")) return;

  if (bgVideo) {
    bgVideo.remove();
    bgVideo = null;
  }

  // createVideo from data URL
  bgVideo = createVideo([file.data], () => {
    bgVideo.loop();
    bgVideo.volume(0);
  });
  bgVideo.hide();

  videoTiles = [];
  videoTileNeedsUpdate = true;
  videoInvert = false;

  redrawCanvas();
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
// DRAW ONE HYBRID GLYPH
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
  swapSides,
  rotateActive,
  sideMode
) {
  const gA = otFontA.charToGlyph(ch);
  const gB = otFontB.charToGlyph(ch);
  if (!gA || !gB) return;

  const sizeA = baseSize * (scaleASlider.value() / 100);
  const sizeB = baseSize * (scaleBSlider.value() / 100);
  const offA = (offsetASlider.value() / 100) * baseSize;
  const offB = (offsetBSlider.value() / 100) * baseSize;

  const x0 = xBase;

  const bbox = unionBBoxPx(gA, gB, x0, yBase, sizeA, sizeB, offA, offB);
  const { xMin, xMax, yMin, yMax } = bbox;
  const w = xMax - xMin;
  const h = yMax - yMin;

  const pad = outlineWidth > 0 || blurAmount > 0
    ? outlineWidth * 2 + blurAmount * 4 + 8
    : 0;

  const ctx = drawingContext;

  const pathA = gA.getPath(x0 + offA, yBase, sizeA);
  const pathB = gB.getPath(x0 + offB, yBase, sizeB);

  function drawHalf(path, rx, ry, rw, rh) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();

    // glow
    if (outlineWidth > 0 && blurAmount > 0) {
      ctx.lineWidth = outlineWidth;
      ctx.lineJoin = joinType;
      ctx.lineCap = joinType;
      ctx.strokeStyle = outlineColor;

      ctx.shadowBlur = blurAmount * 4;
      ctx.shadowColor = outlineColor;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      tracePathOnContext(ctx, path);
      ctx.stroke();
    }

    // sharp outline
    if (outlineWidth > 0) {
      ctx.lineWidth = outlineWidth;
      ctx.lineJoin = joinType;
      ctx.lineCap = joinType;
      ctx.strokeStyle = outlineColor;

      ctx.shadowBlur = 0;
      ctx.shadowColor = "rgba(0,0,0,0)";

      tracePathOnContext(ctx, path);
      ctx.stroke();
    }

    // fill
    ctx.shadowBlur = 0;
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.fillStyle = fillColor;
    tracePathOnContext(ctx, path);
    ctx.fill();

    ctx.restore();
  }

  // quarter mode: A/B/A/B with beat-driven rotation (clockwise)
  if (mode === "quarters") {
    const midX = (xMin + xMax) / 2;
    const midY = (yMin + yMax) / 2;

    const sm = rotateActive ? (sideMode % 4 + 4) % 4 : 0;

    // 0=TL,1=TR,2=BR,3=BL
    const quads = [
      { x: xMin - pad, y: yMin - pad, w: (midX - xMin) + pad, h: (midY - yMin) + pad },      // TL
      { x: midX,       y: yMin - pad, w: (xMax + pad) - midX, h: (midY - yMin) + pad },      // TR
      { x: midX,       y: midY,       w: (xMax + pad) - midX, h: (yMax + pad) - midY },      // BR
      { x: xMin - pad, y: midY,       w: (midX - xMin) + pad, h: (yMax + pad) - midY }       // BL
    ];

    for (let q = 0; q < 4; q++) {
      const useA = ((q + sm) % 2 === 0); // TL=A,TR=B,BR=A,BL=B, then rotated
      const quad = quads[q];
      drawHalf(useA ? pathA : pathB, quad.x, quad.y, quad.w, quad.h);
    }
    return;
  }

  // vertical/horizontal split
  let effMode = mode;
  let aOnLeft = true;
  let aOnTop = true;

  if (rotateActive) {
    const sm = sideMode % 4;
    if (sm === 0) {
      effMode = "vertical";
      aOnLeft = true;
      aOnTop = true;
    } else if (sm === 1) {
      effMode = "horizontal";
      aOnTop = true;
      aOnLeft = true;
    } else if (sm === 2) {
      effMode = "vertical";
      aOnLeft = false;
      aOnTop = true;
    } else {
      effMode = "horizontal";
      aOnTop = false;
      aOnLeft = true;
    }
  } else {
    if (mode === "vertical") {
      aOnLeft = !swapSides;
    } else if (mode === "horizontal") {
      aOnTop = !swapSides;
    }
  }

  if (effMode === "vertical") {
    const splitX = xMin + cutRatio * w;

    const leftX = xMin - pad;
    const leftY = yMin - pad;
    const leftW = (splitX - xMin) + pad;
    const leftH = h + 2 * pad;

    const rightX = splitX;
    const rightY = yMin - pad;
    const rightW = (xMax + pad) - splitX;
    const rightH = h + 2 * pad;

    if (aOnLeft) {
      drawHalf(pathA, leftX, leftY, leftW, leftH);
      drawHalf(pathB, rightX, rightY, rightW, rightH);
    } else {
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

    if (aOnTop) {
      drawHalf(pathA, topX, topY, topW, topH);
      drawHalf(pathB, bottomX, bottomY, bottomW, bottomH);
    } else {
      drawHalf(pathB, topX, topY, topW, topH);
      drawHalf(pathA, bottomX, bottomY, bottomW, bottomH);
    }
  }
}

// ----------------------------------------------------------
// BACKGROUND (including video tiles)
// ----------------------------------------------------------
function updateVideoTiles() {
  if (!bgVideo) return;

  videoTiles = [];
  const tileCount = 6; // number of squares

  const minSize = min(width, height) * 0.15;
  const maxSize = min(width, height) * 0.35;

  for (let i = 0; i < tileCount; i++) {
    const s = random(minSize, maxSize);
    const x = random(-s * 0.2, width - s * 0.8);
    const y = random(-s * 0.2, height - s * 0.8);
    videoTiles.push({ x, y, w: s, h: s });
  }
}

function drawBackground() {
  const mode = bgModeSelect.value();

  if (mode === "video" && bgVideo && bgVideo.width > 0 && bgVideo.height > 0) {
    if (videoTiles.length === 0 || videoTileNeedsUpdate) {
      updateVideoTiles();
      videoTileNeedsUpdate = false;
    }

    push();
    for (let i = 0; i < videoTiles.length; i++) {
      const t = videoTiles[i];
      image(bgVideo, t.x, t.y, t.w, t.h);
    }
    pop();

    if (videoInvert) {
      push();
      blendMode(DIFFERENCE);
      noStroke();
      fill(255);
      rect(0, 0, width, height);
      pop();
    }

  } else if (mode === "image" && bgImg) {
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
// SHAPING AND MAIN DRAW (always horizontal text)
// ----------------------------------------------------------
function shapeLinesHorizontal(txt, baseSize, baseTracking, margin) {
  const rawLines = txt.split("\n");
  ensureLineSettings(rawLines.length);

  const shaped = [];

  for (let i = 0; i < rawLines.length; i++) {
    const lineText = rawLines[i];
    const ls = lineSettings[i];

    const sizeLine = baseSize * ls.sizeFactor;
    const trackingLine = baseTracking + ls.trackingDelta;
    const lhFactor = ls.lineHeightFactor;

    let w = 0;

    for (let j = 0; j < lineText.length; j++) {
      const ch = lineText[j];
      const gA = otFontA.charToGlyph(ch);
      const gB = otFontB.charToGlyph(ch);
      if (!gA || !gB) continue;

      const advA = glyphAdvance(gA, otFontA, sizeLine);
      const advB = glyphAdvance(gB, otFontB, sizeLine);
      const adv = (advA + advB) * 0.5;

      if (j > 0) w += trackingLine;
      w += adv;
    }

    shaped.push({
      text: lineText,
      width: w,
      size: sizeLine,
      tracking: trackingLine,
      lhFactor: lhFactor
    });
  }

  return shaped;
}

function draw() {
  clear();

  const z = zoomSlider ? zoomSlider.value() : 1;
  const cx = posterWidth / 2;
  const cy = posterHeight / 2;

  push();
  translate(width / 2, height / 2);
  scale(z);
  translate(-cx, -cy);

  drawBackground();

  if (!otFontA || !otFontB) {
    push();
    fill(DEFAULT_UI_GREEN);
    textSize(16);
    textFont(systemFont());
    text("Load Font A and Font B to start.", 40, 60);
    pop();
    pop();
    return;
  }

  const txt = textInput.value();
  const baseSize = sizeSlider.value();
  const baseTracking = trackingSlider.value();
  const alignMode = alignSelect.value();
  const globalLineH = lineHeightSlider.value();

  // AUDIO / BEAT (rotation + video tiles every 2nd beat)
  let beatMode =
    audioBeatCheckbox &&
    audioBeatCheckbox.checked() &&
    audio &&
    amplitudeAnalyzer;

  if (beatMode) {
    const audioLevel = amplitudeAnalyzer.getLevel();
    const sens = audioSensitivitySlider.value();

    if (avgLevel === 0) {
      avgLevel = audioLevel;
    } else {
      const smoothing = 0.05 + sens * 0.1;
      avgLevel = lerp(avgLevel, audioLevel, smoothing);
    }

    const margin = 0.03 + (1 - sens) * 0.12;
    const beatThreshold = avgLevel + margin;

    const now = millis();
    const minBeatInterval = 150 + (1 - sens) * 350;

    if (
      audioLevel > beatThreshold &&
      audioLevel > 0.02 &&
      audioLevel > lastAudioLevel &&
      now - lastBeatTime > minBeatInterval
    ) {
      // primary beat for typography
      swapSidesBeat = !swapSidesBeat;
      sideModeBeat = (sideModeBeat + 1) % 4;
      lastBeatTime = now;

      // slower pattern for video: every 2nd beat
      videoBeatCounter++;
      if (videoBeatCounter % 2 === 0) {
        videoTileNeedsUpdate = true;
        videoInvert = !videoInvert;
      }
    }
    lastAudioLevel = audioLevel;
  }

  const mode = axisModeSelect.value();

  const baseCut = cutSlider.value() / 100;
  let cutRatio = baseCut;

  if (mode === "vertical") {
    cutLabel.html("Cut position (0 = left, 100 = right)");
  } else if (mode === "horizontal") {
    cutLabel.html("Cut position (0 = bottom, 100 = top)");
  } else {
    cutLabel.html("Quarters (A/B/A/B) — cut ignored");
  }

  const fillColor = fillPicker.value();
  const outlineColor = outlinePicker.value();
  const outlineWidth = outlineWidthSlider.value();
  const blurAmount = outlineBlurSlider.value();

  let joinType = "miter";
  const r = outlineRoundSlider.value();
  if (r === 1) joinType = "bevel";
  if (r === 2) joinType = "round";

  const margin = baseSize * 0.4;

  let swapSidesGlobal = false;
  let rotateActive = false;
  let sideModeGlobal = 0;

  if (!beatMode && alternateSideCheckbox && alternateSideCheckbox.checked()) {
    const t2 = millis() * 0.001 * alternateSideSpeedSlider.value();
    swapSidesGlobal = Math.sin(t2) > 0;
  }

  if (!beatMode && rotateSidesCheckbox && rotateSidesCheckbox.checked()) {
    rotateActive = (mode !== "quarters");
    const t3 = millis() * 0.001 * rotateSidesSpeedSlider.value();
    sideModeGlobal = Math.floor(t3) % 4;
  }

  if (beatMode) {
    swapSidesGlobal = swapSidesBeat;
    rotateActive = true;
    sideModeGlobal = sideModeBeat;
  }

  const shaped = shapeLinesHorizontal(txt, baseSize, baseTracking, margin);
  let y = baseSize * 1.2;

  for (let li = 0; li < shaped.length; li++) {
    const line = shaped[li];
    const sizeLine = line.size;
    const trackingLine = line.tracking;
    const lhLine = sizeLine * globalLineH * line.lhFactor;

    const maxWidth = posterWidth - 2 * margin;
    let x;

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

      const rotateForThisGlyph =
        (mode === "quarters" ? beatMode : rotateActive);
      const sideModeForThisGlyph =
        (mode === "quarters" ? sideModeBeat : sideModeGlobal);

      drawSplitGlyph(
        ch,
        x,
        y,
        sizeLine,
        mode,
        cutRatio,
        fillColor,
        outlineColor,
        outlineWidth,
        joinType,
        blurAmount,
        swapSidesGlobal,
        rotateForThisGlyph,
        sideModeForThisGlyph
      );

      const advA = glyphAdvance(gA, otFontA, sizeLine);
      const advB = glyphAdvance(gB, otFontB, sizeLine);
      const adv = (advA + advB) * 0.5;

      x += adv + trackingLine;
    }

    y += lhLine;
  }

  pop();
}