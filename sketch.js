// sketch.js
// Requires in index.html:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/opentype.js/1.3.4/opentype.min.js"></script>
// <script src="sketch.js"></script>

let otFontA = null;
let otFontB = null;

let textInput;
let sizeSlider;
let trackingSlider;
let axisModeSelect;

let axisParamSlider;     // meaning depends on mode
let axisParamLabel;

let stripeCountSlider;
let stripeCountLabel;

let saveBtn;

let fontAStatusP;
let fontBStatusP;

function setup() {
  createCanvas(windowWidth, windowHeight - 220);
  noLoop();

  // UI container
  const ui = createDiv();
  ui.style("padding", "8px");
  ui.style("font-family", "system-ui, -apple-system, BlinkMacSystemFont, sans-serif");
  ui.style("font-size", "12px");
  ui.style("color", "#f5f5f5");
  ui.style("background", "#181818");
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
    h.style("color", "#aaa");

    return s;
  }

  // Fonts section
  const fontsSec = section("Fonts");

  fontsSec.child(createSpan("Font A"));

  const fontAInput = createFileInput(file => handleFontFile(file, "A"));
  fontAInput.parent(fontsSec);
  fontAInput.style("font-size", "11px");

  fontsSec.child(createSpan("Font B"));

  const fontBInput = createFileInput(file => handleFontFile(file, "B"));
  fontBInput.parent(fontsSec);
  fontBInput.style("font-size", "11px");

  fontAStatusP = createP("Font A: none");
  fontAStatusP.parent(fontsSec);
  fontAStatusP.style("margin", "4px 0 0 0");
  fontAStatusP.style("color", "#ccc");

  fontBStatusP = createP("Font B: none");
  fontBStatusP.parent(fontsSec);
  fontBStatusP.style("margin", "2px 0 0 0");
  fontBStatusP.style("color", "#ccc");

  const hint = createP("Works best if A and B are related designs, but mismatched splicing can be nice too.");
  hint.parent(fontsSec);
  hint.style("margin", "6px 0 0 0");
  hint.style("color", "#888");
  hint.style("font-size", "11px");

  // Text section
  const textSec = section("Text");

  textInput = createInput("Hybrid glyphs");
  textInput.parent(textSec);
  textInput.style("padding", "4px 6px");
  textInput.style("border-radius", "4px");
  textInput.style("border", "1px solid #444");
  textInput.style("background", "#111");
  textInput.style("color", "#f5f5f5");
  textInput.style("font-size", "12px");
  textInput.style("width", "100%");
  textInput.input(redrawCanvas);

  // Basic parameters
  const paramSec = section("Global parameters");

  paramSec.child(createSpan("Font size"));

  sizeSlider = createSlider(24, 220, 140, 1);
  sizeSlider.parent(paramSec);
  sizeSlider.input(redrawCanvas);

  paramSec.child(createSpan("Tracking (letter spacing)"));

  trackingSlider = createSlider(-20, 80, 10, 1);
  trackingSlider.parent(paramSec);
  trackingSlider.input(redrawCanvas);

  // Axis mixing section
  const mixSec = section("Inside glyph mixing");

  mixSec.child(createSpan("Axis mode"));

  axisModeSelect = createSelect();
  axisModeSelect.parent(mixSec);
  axisModeSelect.option("Vertical cut (left/right)", "vertical");
  axisModeSelect.option("Horizontal cut (top/bottom)", "horizontal");
  axisModeSelect.option("Vertical stripes", "stripes");
  axisModeSelect.changed(updateAxisControls);
  
  axisParamLabel = createSpan("Vertical position of cut");
  axisParamLabel.parent(mixSec);

  axisParamSlider = createSlider(0, 100, 50, 1);
  axisParamSlider.parent(mixSec);
  axisParamSlider.input(redrawCanvas);

  stripeCountLabel = createSpan("Stripe count (used in stripes mode)");
  stripeCountLabel.parent(mixSec);

  stripeCountSlider = createSlider(2, 16, 4, 1);
  stripeCountSlider.parent(mixSec);
  stripeCountSlider.input(redrawCanvas);

  // Export section
  const exportSec = section("Export");

  saveBtn = createButton("Save PNG");
  saveBtn.parent(exportSec);
  saveBtn.mousePressed(() => {
    saveCanvas("hybrid_glyphs_axes", "png");
  });

  updateAxisControls();
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

function updateAxisControls() {
  const mode = axisModeSelect.value();
  if (mode === "vertical") {
    axisParamLabel.html("Vertical cut position (0 left - 100 right)");
    axisParamSlider.show();
    stripeCountLabel.hide();
    stripeCountSlider.hide();
  } else if (mode === "horizontal") {
    axisParamLabel.html("Horizontal cut position (0 bottom - 100 top)");
    axisParamSlider.show();
    stripeCountLabel.hide();
    stripeCountSlider.hide();
  } else if (mode === "stripes") {
    axisParamLabel.html("Stripe offset / phase");
    axisParamSlider.show();
    stripeCountLabel.show();
    stripeCountSlider.show();
  }
  redrawCanvas();
}

// Get representative coordinate for a path command
function representativePoint(cmd) {
  // Prefer final point (x, y) if present
  if (cmd.x !== undefined && cmd.y !== undefined) {
    return { x: cmd.x, y: cmd.y };
  }
  if (cmd.x1 !== undefined && cmd.y1 !== undefined) {
    return { x: cmd.x1, y: cmd.y1 };
  }
  if (cmd.x2 !== undefined && cmd.y2 !== undefined) {
    return { x: cmd.x2, y: cmd.y2 };
  }
  return { x: 0, y: 0 };
}

// Make a picker function that chooses A or B for a given (x, y) inside glyph space
function makeAxisPicker(bbox, mode, params) {
  const xMin = bbox.x1;
  const xMax = bbox.x2;
  const yMin = bbox.y1;
  const yMax = bbox.y2;

  // Avoid zero widths or heights
  const w = max(1e-6, xMax - xMin);
  const h = max(1e-6, yMax - yMin);

  if (mode === "vertical") {
    const t = params.cutPos; // 0-1
    const splitX = xMin + t * w;
    return function (x, y) {
      return x < splitX ? "A" : "B";
    };
  }

  if (mode === "horizontal") {
    const t = params.cutPos; // 0-1 bottom to top
    const splitY = yMin + t * h;
    return function (x, y) {
      return y < splitY ? "A" : "B"; // note: font coords are y up
    };
  }

  if (mode === "stripes") {
    const count = max(1, params.stripes);
    const phase = params.phase; // 0-1

    return function (x, y) {
      const u = ((x - xMin) / w + phase) * count;
      const stripeIndex = floor(u);
      return stripeIndex % 2 === 0 ? "A" : "B";
    };
  }

  // Fallback
  return function () {
    return "A";
  };
}

// Mix commands by axis: for each pair of commands, choose A or B according to axis picker
function mixCommands(commandsA, commandsB, bbox, mode, params) {
  const n = min(commandsA.length, commandsB.length);
  const out = [];

  const pickFont = makeAxisPicker(bbox, mode, params);

  for (let i = 0; i < n; i++) {
    const ca = commandsA[i];
    const cb = commandsB[i];

    if (ca.type === "Z" || cb.type === "Z") {
      // Just push from A to keep contours closed
      out.push(ca);
      continue;
    }

    if (ca.type !== cb.type) {
      // Structure mismatch: choose randomly between A and B
      out.push(random() < 0.5 ? ca : cb);
      continue;
    }

    const p = representativePoint(ca);
    const choose = pickFont(p.x, p.y);

    out.push(choose === "A" ? ca : cb);
  }

  return out;
}

// Draw a path described by opentype style commands on p5 canvas
function drawCommands(commands, xOffset, yOffset, scaleFactor) {
  push();
  translate(xOffset, yOffset);
  scale(scaleFactor, -scaleFactor); // opentype coords: y up

  let isOpen = false;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];

    if (cmd.type === "M") {
      if (isOpen) {
        endShape();
      }
      beginShape();
      vertex(cmd.x, cmd.y);
      isOpen = true;
    } else if (cmd.type === "L") {
      vertex(cmd.x, cmd.y);
    } else if (cmd.type === "Q") {
      quadraticVertex(cmd.x1, cmd.y1, cmd.x, cmd.y);
    } else if (cmd.type === "C") {
      bezierVertex(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
    } else if (cmd.type === "Z") {
      if (isOpen) {
        endShape(CLOSE);
        isOpen = false;
      }
    }
  }

  if (isOpen) {
    endShape();
  }

  pop();
}

function glyphAdvance(glyph, font, fontSize) {
  const unitsPerEm = font.unitsPerEm || 1000;
  const aw = glyph.advanceWidth || font.getAdvanceWidth(" ", fontSize);
  return aw * (fontSize / unitsPerEm);
}

function draw() {
  background(240);

  if (!otFontA || !otFontB) {
    push();
    textFont("sans-serif");
    fill(60);
    textSize(16);
    text("Load Font A and Font B to splice glyphs.", 40, 60);
    pop();
    return;
  }

  const txt = textInput ? textInput.value() : "";
  const fontSize = sizeSlider ? int(sizeSlider.value()) : 140;
  const tracking = trackingSlider ? int(trackingSlider.value()) : 10;
  const mode = axisModeSelect ? axisModeSelect.value() : "vertical";

  const cutPos = axisParamSlider ? axisParamSlider.value() / 100 : 0.5;
  const stripes = stripeCountSlider ? int(stripeCountSlider.value()) : 4;
  const phase = axisParamSlider ? axisParamSlider.value() / 100 : 0.0;

  const params = {
    cutPos,
    stripes,
    phase
  };

  const marginX = 40;
  let x = marginX;
  let y = height / 2;

  fill(0);
  noStroke();

  const unitsPerEmA = otFontA.unitsPerEm || 1000;

  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];

    if (ch === "\n") {
      x = marginX;
      y += fontSize * 1.4;
      continue;
    }

    const glyphA = otFontA.charToGlyph(ch);
    const glyphB = otFontB.charToGlyph(ch);

    if (!glyphA || !glyphB) {
      continue;
    }

    const bboxA = glyphA.getBoundingBox();
    const bboxB = glyphB.getBoundingBox();

    // Merge bounds to be safe
    const bbox = {
      x1: min(bboxA.x1, bboxB.x1),
      y1: min(bboxA.y1, bboxB.y1),
      x2: max(bboxA.x2, bboxB.x2),
      y2: max(bboxA.y2, bboxB.y2)
    };

    const pathA = glyphA.getPath(0, 0, unitsPerEmA);
    const pathB = glyphB.getPath(0, 0, unitsPerEmA);

    const mixed = mixCommands(pathA.commands, pathB.commands, bbox, mode, params);

    drawCommands(mixed, x, y, fontSize / unitsPerEmA);

    const advA = glyphAdvance(glyphA, otFontA, fontSize);
    const advB = glyphAdvance(glyphB, otFontB, fontSize);
    const adv = (advA + advB) * 0.5;

    x += adv + tracking;

    if (x > width - marginX) {
      x = marginX;
      y += fontSize * 1.4;
    }
  }

  // Debug legend
  push();
  textFont("sans-serif");
  textSize(11);
  fill(80);
  let legend = "Mode: " + mode;
  if (mode === "vertical" || mode === "horizontal") {
    legend += " - cut: " + axisParamSlider.value() + "%";
  } else if (mode === "stripes") {
    legend += " - stripes: " + stripes + " - phase: " + axisParamSlider.value() + "%";
  }
  text(legend, 40, height - 20);
  pop();
}