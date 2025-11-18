// sketch.js
// Needs in index.html (in this order):
// p5.js, paper-full.js, opentype.js, then this file.

let otFontA = null;
let otFontB = null;

let textInput;
let sizeSlider;
let trackingSlider;
let axisModeSelect;
let cutSlider;
let cutLabel;

let savePngBtn;
let saveOtfBtn;

let fontAStatusP;
let fontBStatusP;

const GREEN = "#1f6a3a";

function setup() {
  createCanvas(windowWidth, windowHeight - 220);
  noLoop();

  // init Paper with a dummy canvas (used only for geometry)
  const dummyCanvas = document.createElement("canvas");
  paper.setup(dummyCanvas);

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

  // Fonts section
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
    "Preview + OTF: left/top half from A, right/bottom half from B, using real outline clipping."
  );
  hint.parent(fontsSec);
  hint.style("margin", "6px 0 0 0");
  hint.style("color", GREEN);
  hint.style("font-size", "11px");

  // Text section
  const textSec = section("Text");
  textInput = createInput("BFD");
  textInput.parent(textSec);
  styleTextInput(textInput);
  textInput.input(redrawCanvas);

  // Preview parameters
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

  cutLabel = createSpan("Cut position (0 = left, 100 = right)");
  cutLabel.parent(axisSec);

  cutSlider = createSlider(0, 100, 50, 1);
  cutSlider.parent(axisSec);
  cutSlider.input(redrawCanvas);

  // Export
  const exportSec = section("Export");

  savePngBtn = createButton("Save PNG");
  savePngBtn.parent(exportSec);
  savePngBtn.mousePressed(() => saveCanvas("hybrid_preview", "png"));

  saveOtfBtn = createButton("Download hybrid OTF");
  saveOtfBtn.parent(exportSec);
  saveOtfBtn.mousePressed(downloadHybridFont);
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

// bbox in canvas pixels for preview
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

// preview: draw one split glyph using canvas clipping
function drawSplitGlyph(ch, x, y, fontSize, mode, cutRatio) {
  const glyphA = otFontA.charToGlyph(ch);
  const glyphB = otFontB.charToGlyph(ch);
  if (!glyphA || !glyphB) return;

  const ctx = drawingContext;

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

    // left from A
    ctx.save();
    ctx.beginPath();
    ctx.rect(xMin, yMin, splitX - xMin, h);
    ctx.clip();
    glyphA.getPath(x, y, fontSize).draw(ctx);
    ctx.restore();

    // right from B
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, yMin, xMax - splitX, h);
    ctx.clip();
    glyphB.getPath(x, y, fontSize).draw(ctx);
    ctx.restore();
  } else {
    const splitY = yMax - cutRatio * h; // 0 bottom, 1 top

    // bottom from B
    ctx.save();
    ctx.beginPath();
    ctx.rect(xMin, splitY, w, yMax - splitY);
    ctx.clip();
    glyphB.getPath(x, y, fontSize).draw(ctx);
    ctx.restore();

    // top from A
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
  let y = height * 0.75;

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

//////////////////////////////////////////////////////////////
//  Boolean clipping for font export using Paper.js
//////////////////////////////////////////////////////////////

// opentype.Path -> paper.Path (font units)
// y axis is flipped for Paper space; we flip back later
function opentypePathToPaper(path) {
  const p = new paper.Path();
  const cmds = path.commands;
  let currentPoint = null;

  for (let i = 0; i < cmds.length; i++) {
    const c = cmds[i];
    if (c.type === "M") {
      const pt = new paper.Point(c.x, -c.y);
      p.moveTo(pt);
      currentPoint = pt;
    } else if (c.type === "L") {
      const pt = new paper.Point(c.x, -c.y);
      p.lineTo(pt);
      currentPoint = pt;
    } else if (c.type === "Q") {
      const p0 = currentPoint;
      const q = new paper.Point(c.x1, -c.y1);
      const p2 = new paper.Point(c.x, -c.y);
      const c1 = p0.add(q.subtract(p0).multiply(2 / 3));
      const c2 = p2.add(q.subtract(p2).multiply(2 / 3));
      p.cubicCurveTo(c1, c2, p2);
      currentPoint = p2;
    } else if (c.type === "C") {
      const c1 = new paper.Point(c.x1, -c.y1);
      const c2 = new paper.Point(c.x2, -c.y2);
      const p2 = new paper.Point(c.x, -c.y);
      p.cubicCurveTo(c1, c2, p2);
      currentPoint = p2;
    } else if (c.type === "Z") {
      p.closePath();
    }
  }

  p.closed = true;
  p.fillColor = new paper.Color("black");
  return p;
}

// check if a Paper item actually has geometry
function paperHasGeometry(item) {
  if (!item) return false;
  if (item instanceof paper.Path) {
    return item.segments && item.segments.length > 0;
  }
  if (item instanceof paper.CompoundPath) {
    if (!item.children || !item.children.length) return false;
    return item.children.some(ch => ch.segments && ch.segments.length > 0);
  }
  return false;
}

// paper.Path or CompoundPath -> opentype.Path
function paperPathToOpenType(path) {
  const otPath = new opentype.Path();

  if (!path) return otPath;

  // CompoundPath: merge all children
  if (path instanceof paper.CompoundPath) {
    if (!path.children) return otPath;
    path.children.forEach(child => {
      const childOt = paperPathToOpenType(child);
      otPath.commands = otPath.commands.concat(childOt.commands);
    });
    return otPath;
  }

  const segs = path.segments || [];
  if (!segs.length) return otPath;

  let first = segs[0];
  otPath.moveTo(first.point.x, -first.point.y);

  for (let i = 1; i < segs.length; i++) {
    const prev = segs[i - 1];
    const cur = segs[i];

    const p0 = prev.point;
    const p1 = cur.point;
    const h0 = prev.handleOut;
    const h1 = cur.handleIn;

    const hasCurve = !h0.isZero() || !h1.isZero();

    if (hasCurve) {
      const c1 = p0.add(h0);
      const c2 = p1.add(h1);
      otPath.curveTo(
        c1.x, -c1.y,
        c2.x, -c2.y,
        p1.x, -p1.y
      );
    } else {
      otPath.lineTo(p1.x, -p1.y);
    }
  }

  if (path.closed) {
    otPath.close();
  }

  return otPath;
}

// build one hybrid glyph (font units) with Paper boolean ops
function buildHybridGlyph(unicode, mode, cutRatio, baseUnits) {
  const ch = String.fromCharCode(unicode);
  const gA = otFontA.charToGlyph(ch);
  const gB = otFontB.charToGlyph(ch);

  if (!gA && !gB) return null;
  if (!gA && gB) return gB;
  if (gA && !gB) return gA;

  const bbA = gA.getBoundingBox();
  const bbB = gB.getBoundingBox();
  const x1 = Math.min(bbA.x1, bbB.x1);
  const y1 = Math.min(bbA.y1, bbB.y1);
  const x2 = Math.max(bbA.x2, bbB.x2);
  const y2 = Math.max(bbA.y2, bbB.y2);
  const w = x2 - x1;
  const h = y2 - y1;

  let rectA;
  let rectB;

  if (mode === "vertical") {
    const splitX = x1 + cutRatio * w;

    rectA = new paper.Path.Rectangle(
      new paper.Rectangle(
        new paper.Point(x1, -y2),
        new paper.Point(splitX, -y1)
      )
    );
    rectB = new paper.Path.Rectangle(
      new paper.Rectangle(
        new paper.Point(splitX, -y2),
        new paper.Point(x2, -y1)
      )
    );
  } else {
    const splitY = y1 + cutRatio * h; // 0 bottom, 1 top

    rectA = new paper.Path.Rectangle(
      new paper.Rectangle(
        new paper.Point(x1, -y2),
        new paper.Point(x2, -splitY)
      )
    );
    rectB = new paper.Path.Rectangle(
      new paper.Rectangle(
        new paper.Point(x1, -splitY),
        new paper.Point(x2, -y1)
      )
    );
  }

  rectA.closed = true;
  rectB.closed = true;

  const pathAFull = opentypePathToPaper(gA.getPath(0, 0, baseUnits));
  const pathBFull = opentypePathToPaper(gB.getPath(0, 0, baseUnits));

  let pieceA = pathAFull.intersect(rectA);
  let pieceB = pathBFull.intersect(rectB);

  pathAFull.remove();
  pathBFull.remove();
  rectA.remove();
  rectB.remove();

  const hasA = paperHasGeometry(pieceA);
  const hasB = paperHasGeometry(pieceB);

  if (!hasA && !hasB) {
    if (pieceA) pieceA.remove();
    if (pieceB) pieceB.remove();
    return null;
  }

  let hybridShape;
  if (hasA && hasB) {
    hybridShape = pieceA.unite(pieceB);
    pieceA.remove();
    pieceB.remove();
  } else if (hasA) {
    hybridShape = pieceA;
    if (pieceB) pieceB.remove();
  } else {
    hybridShape = pieceB;
    if (pieceA) pieceA.remove();
  }

  const otPath = paperPathToOpenType(hybridShape);
  hybridShape.remove();

  const advA = gA.advanceWidth || baseUnits;
  const advB = gB.advanceWidth || baseUnits;
  const adv = (advA + advB) * 0.5;

  return new opentype.Glyph({
    name: gA.name || gB.name,
    unicode: unicode,
    advanceWidth: adv,
    path: otPath
  });
}

// build and download HybridFont.otf
function downloadHybridFont() {
  if (!otFontA || !otFontB) {
    alert("Load both Font A and Font B first.");
    return;
  }

  const mode = axisModeSelect ? axisModeSelect.value() : "vertical";
  const cutRatio = (cutSlider ? cutSlider.value() : 50) / 100;
  const unitsPerEm = otFontA.unitsPerEm || 1000;

  const glyphs = [];

  // ASCII printable range; extend if you want more
  for (let u = 32; u <= 126; u++) {
    const hybridGlyph = buildHybridGlyph(u, mode, cutRatio, unitsPerEm);
    if (hybridGlyph) glyphs.push(hybridGlyph);
  }

  const font = new opentype.Font({
    familyName: "HybridFont",
    styleName: "Regular",
    unitsPerEm: unitsPerEm,
    ascender: otFontA.ascender,
    descender: otFontA.descender,
    glyphs: glyphs
  });

  const arrayBuffer = font.toArrayBuffer();
  const blob = new Blob([arrayBuffer], { type: "font/otf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "HybridFont.otf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}