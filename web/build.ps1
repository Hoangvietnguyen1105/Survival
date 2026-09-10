# ============================================================
#  NEON HORDE - build script
#  Gop toan bo CSS + JS vao 1 file HTML duy nhat.
#  Chay:  powershell -ExecutionPolicy Bypass -File build.ps1
#  Ket qua: dist\NeonHorde.html  (mo truc tiep bang trinh duyet)
# ============================================================

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dist = Join-Path $root 'dist'
if (-not (Test-Path $dist)) { New-Item -ItemType Directory -Path $dist | Out-Null }

# --- thu tu file JS phai giu nguyen ---
$jsFiles = @('utils.js', 'audio.js', 'gfx.js', 'input.js', 'data.js', 'sigils.js', 'entities.js', 'game.js', 'ui.js', 'main.js')

$css = Get-Content (Join-Path $root 'styles.css') -Raw -Encoding UTF8

$sb = New-Object System.Text.StringBuilder
foreach ($f in $jsFiles) {
  $p = Join-Path $root "js\$f"
  [void]$sb.AppendLine("/* ================= $f ================= */")
  [void]$sb.AppendLine((Get-Content $p -Raw -Encoding UTF8))
}
$js = $sb.ToString()

# --- lay phan body cua index.html, bo cac the <script src> ---
$html = Get-Content (Join-Path $root 'index.html') -Raw -Encoding UTF8
$m = [regex]::Match($html, '(?s)<body>(.*?)</body>')
if (-not $m.Success) { throw 'Khong tim thay <body> trong index.html' }
$body = $m.Groups[1].Value
$body = [regex]::Replace($body, '(?s)<script\s+src=.*?</script>\s*', '')
$body = $body.Trim()

# --- 1) ban standalone day du (mo bang file:// duoc) ---
$standalone = @"
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>NEON HORDE</title>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#06070d">
<meta name="description" content="Roguelike survivor - song sot giua bay quai.">
<style>
$css
</style>
</head>
<body>
$body
<script>
$js
</script>
</body>
</html>
"@

# --- 2) ban chi co noi dung (cho Claude Artifact / nhung vao trang khac) ---
$embed = @"
<title>NEON HORDE</title>
<style>
$css
</style>
$body
<script>
$js
</script>
"@

$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path $dist 'NeonHorde.html'), $standalone, $utf8)
[System.IO.File]::WriteAllText((Join-Path $dist 'embed.html'), $embed, $utf8)

$size = [math]::Round((Get-Item (Join-Path $dist 'NeonHorde.html')).Length / 1KB, 1)
Write-Host "OK -> dist\NeonHorde.html ($size KB)"
Write-Host "OK -> dist\embed.html"
