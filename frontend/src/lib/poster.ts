import QRCode from "qrcode";

const SIZE = 1080;
const BRAND = "#0F4C3A";
const ACCENT = "#F2A33A";
const TAG_PATH =
  "M4 9.5A3.5 3.5 0 0 1 7.5 6h11.3a3.5 3.5 0 0 1 2.47 1.03l6.2 6.2a3.5 3.5 0 0 1 0 4.95l-8.3 8.3a3.5 3.5 0 0 1-4.95 0l-9.2-9.2A3.5 3.5 0 0 1 4 14.8V9.5Z";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws the square social poster from the design as a PNG. */
export async function socialPosterPng(shopName: string, link: string): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const u = SIZE / 100;

  ctx.fillStyle = BRAND;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = "rgba(255,255,255,.09)";
  for (let x = 20; x < SIZE; x += 40) {
    for (let y = 20; y < SIZE; y += 40) ctx.fillRect(x, y, 2.5, 2.5);
  }
  ctx.fillStyle = ACCENT;
  ctx.fillRect(SIZE * 0.72, 0, SIZE * 0.06, SIZE);

  const pad = 7 * u;
  ctx.save();
  ctx.translate(pad, pad);
  ctx.scale((6 * u) / 32, (6 * u) / 32);
  ctx.fillStyle = "#fff";
  ctx.fill(new Path2D(TAG_PATH));
  ctx.fillStyle = ACCENT;
  ctx.beginPath();
  ctx.arc(11, 12.5, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${5 * u}px Figtree, system-ui, sans-serif`;
  ctx.fillText("Kepter", pad + 8 * u, pad + 3 * u);

  ctx.textBaseline = "alphabetic";
  ctx.font = `800 ${10 * u}px Figtree, system-ui, sans-serif`;
  const headline = wrap(ctx, "We accept Kepter gift cards", SIZE * 0.6);
  let y = SIZE * 0.36;
  for (const line of headline) {
    ctx.fillText(line, pad, y);
    y += 10.2 * u;
  }

  const qrSize = 26 * u;
  const box = qrSize + 4 * u;
  const boxX = SIZE - pad - box;
  const boxY = SIZE - pad - box;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, box, box, 3 * u);
  ctx.fill();
  const qr = await loadImage(await QRCode.toDataURL(link, { margin: 0, scale: 10, errorCorrectionLevel: "M" }));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, boxX + 2 * u, boxY + 2 * u, qrSize, qrSize);

  const textWidth = boxX - pad - 3 * u;
  ctx.fillStyle = "#fff";
  ctx.font = `400 ${3.4 * u}px Figtree, system-ui, sans-serif`;
  ctx.globalAlpha = 0.85;
  const sub = wrap(ctx, "Buy a gift card for someone, they pay with their phone.", textWidth);
  let subY = SIZE - pad - (sub.length - 1) * 4.4 * u;
  for (const line of sub) {
    ctx.fillText(line, pad, subY);
    subY += 4.4 * u;
  }
  ctx.globalAlpha = 1;
  ctx.font = `800 ${5.4 * u}px Figtree, system-ui, sans-serif`;
  const nameLines = wrap(ctx, shopName, textWidth).slice(0, 2);
  let nameY = SIZE - pad - sub.length * 4.4 * u - 1.5 * u - (nameLines.length - 1) * 6 * u;
  for (const line of nameLines) {
    ctx.fillText(line, pad, nameY);
    nameY += 6 * u;
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not draw poster"))), "image/png"),
  );
}
