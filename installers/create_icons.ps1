Add-Type -AssemblyName System.Drawing

$assetsDir = "d:\Projetos AntiGravity\linguagem\installers\assets"
if (-not (Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir -Force }

function Create-AppIcon {
    param(
        [string]$outputPath,
        [string]$title,
        [System.Drawing.Color]$bg1,
        [System.Drawing.Color]$bg2,
        [System.Drawing.Color]$fgColor,
        [string]$symbol
    )

    $size = 64
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Fundo gradiente com cantos arredondados
    $rect = New-Object System.Drawing.Rectangle(2, 2, $size - 4, $size - 4)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect, $bg1, $bg2, [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
    )
    
    # Desenhar retângulo arredondado
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $radius = 14
    $diameter = $radius * 2
    $path.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
    $path.AddArc($rect.Right - $diameter, $rect.Y, $diameter, $diameter, 270, 90)
    $path.AddArc($rect.Right - $diameter, $rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    $g.FillPath($brush, $path)
    
    # Borda sutil
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 255, 255, 255), 1.5)
    $g.DrawPath($pen, $path)

    # Símbolo Central
    $symFont = New-Object System.Drawing.Font("Segoe UI Emoji", 22, [System.Drawing.FontStyle]::Bold)
    $symBrush = New-Object System.Drawing.SolidBrush($fgColor)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $symRect = New-Object System.Drawing.RectangleF(0, 8, $size, 32)
    $g.DrawString($symbol, $symFont, $symBrush, $symRect, $sf)

    # Texto inferior
    $txtFont = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
    $txtBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $txtRect = New-Object System.Drawing.RectangleF(0, 42, $size, 16)
    $g.DrawString($title, $txtFont, $txtBrush, $txtRect, $sf)

    # Converter para .ico
    $hIcon = $bmp.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    $fs = New-Object System.IO.FileStream($outputPath, [System.IO.FileMode]::Create)
    $icon.Save($fs)
    $fs.Close()

    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Ícone criado com sucesso em: $outputPath"
}

# 1. Ícone da Linguagem Vox
Create-AppIcon `
    -outputPath "$assetsDir\vox_lang.ico" `
    -title "VOX" `
    -bg1 ([System.Drawing.Color]::FromArgb(26, 32, 53)) `
    -bg2 ([System.Drawing.Color]::FromArgb(124, 111, 247)) `
    -fgColor ([System.Drawing.Color]::FromArgb(255, 202, 40)) `
    -symbol "⚡"

# 2. Ícone do Vox Studio RAD
Create-AppIcon `
    -outputPath "$assetsDir\vox_studio.ico" `
    -title "RAD" `
    -bg1 ([System.Drawing.Color]::FromArgb(15, 23, 42)) `
    -bg2 ([System.Drawing.Color]::FromArgb(0, 152, 255)) `
    -fgColor ([System.Drawing.Color]::FromArgb(56, 189, 248)) `
    -symbol "💠"
