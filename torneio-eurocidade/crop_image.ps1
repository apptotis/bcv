Add-Type -AssemblyName System.Drawing
$srcPath = "c:\_ARQUIVO\BCV\cartaz_facebook.jpg"
$destPath = "c:\_ARQUIVO\BCV\cartaz_square.jpg"

if (Test-Path $srcPath) {
    $src = [System.Drawing.Image]::FromFile($srcPath)
    # Criar um bitmap quadrado baseado na largura (1080)
    $bmp = New-Object System.Drawing.Bitmap(1080, 1080)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Definir retângulos de origem e destino
    $rectDest = New-Object System.Drawing.Rectangle(0, 0, 1080, 1080)
    $rectSrc = New-Object System.Drawing.Rectangle(0, 0, 1080, 1080) # Cortar o topo
    
    $g.DrawImage($src, $rectDest, $rectSrc, [System.Drawing.GraphicsUnit]::Pixel)
    
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    
    $g.Dispose()
    $bmp.Dispose()
    $src.Dispose()
    Write-Output "Imagem guardada em $destPath"
} else {
    Write-Error "Ficheiro não encontrado: $srcPath"
}
