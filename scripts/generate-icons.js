const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "icons");
const SIZES = [16, 48, 128];

function findSourceLogo() {
  for (const name of ["logo.png", "logo.jpg", "logo.jpeg"]) {
    const candidate = path.join(ROOT, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

const SOURCE_LOGO = findSourceLogo();

if (!SOURCE_LOGO) {
  console.error("Missing logo.png or logo.jpg at project root:", ROOT);
  process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function generatePngIcons() {
  const ps1Path = path.join(OUTPUT_DIR, ".generate-icons.ps1");
  const source = SOURCE_LOGO.replace(/'/g, "''");
  const lines = SIZES.map((size) => {
    const output = path.join(OUTPUT_DIR, `icon${size}.png`).replace(/'/g, "''");
    return `
$size = ${size}
$bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Transparent)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
$g.DrawImage($src, 0, 0, $size, $size)
$bmp.Save('${output}', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()`;
  });

  const ps1 = `
Add-Type -AssemblyName System.Drawing

function Test-CheckerboardPixel($color) {
  if ($color.A -lt 255) { return $true }
  $avg = ($color.R + $color.G + $color.B) / 3.0
  $var = [Math]::Abs($color.R - $avg) + [Math]::Abs($color.G - $avg) + [Math]::Abs($color.B - $avg)
  return ($var -lt 15 -and $avg -gt 175)
}

function ConvertToTransparentSource($path) {
  $raw = New-Object System.Drawing.Bitmap($path)
  $clean = New-Object System.Drawing.Bitmap($raw.Width, $raw.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

  for ($y = 0; $y -lt $raw.Height; $y++) {
    for ($x = 0; $x -lt $raw.Width; $x++) {
      $color = $raw.GetPixel($x, $y)
      if (Test-CheckerboardPixel $color) {
        $clean.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
      } else {
        $clean.SetPixel($x, $y, $color)
      }
    }
  }

  $raw.Dispose()
  return $clean
}

$src = ConvertToTransparentSource '${source}'
${lines.join("\n")}
$src.Dispose()
`.trim();

  fs.writeFileSync(ps1Path, ps1, "utf8");

  try {
    execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1Path}"`,
      { stdio: "inherit" }
    );
  } finally {
    if (fs.existsSync(ps1Path)) {
      fs.unlinkSync(ps1Path);
    }
  }
}

generatePngIcons();
console.log(`Icons generated from ${path.basename(SOURCE_LOGO)} in`, OUTPUT_DIR);
