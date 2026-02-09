Add-Type -AssemblyName System.Drawing

$width = 128
$height = 128
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

# Transparent Background
$g.Clear([System.Drawing.Color]::Transparent)

# Colors
$c1 = [System.Drawing.ColorTranslator]::FromHtml("#4D96FF")
$c2 = [System.Drawing.ColorTranslator]::FromHtml("#FFD93D")

# Gradient Brush (TopLeft to BottomRight)
$p1 = New-Object System.Drawing.PointF 0, 0
$p2 = New-Object System.Drawing.PointF $width, $height
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $p1, $p2, $c1, $c2

# Font - Be explicit to avoid ambiguity
# Font(String familyName, float emSize, FontStyle style)
$fontStyle = [System.Drawing.FontStyle]::Bold
$fontSize = [float]96
$font = New-Object System.Drawing.Font "Arial", $fontSize, $fontStyle

$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center

# Offset Y slightly for visual centering
$g.DrawString("G", $font, $brush, $width/2, ($height/2) + 6, $format)

$path = "c:\Users\User\Downloads\Hackathon-Gemini-m\icon.png"
$bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
Write-Host "Created $path"
