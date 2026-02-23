Param( [string]$Path )
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (-not (Test-Path $Path)) {
    Write-Error "File not found: $Path"
    exit 1
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
$slides = $zip.Entries | Where-Object { $_.FullName -like "ppt/slides/*.xml" }
foreach ($slide in $slides) {
    # Extract slide number
    $slideNumMatch = [regex]::Match($slide.FullName, '\d+')
    $slideNum = if ($slideNumMatch.Success) { [int]$slideNumMatch.Value } else { 0 }
    
    $stream = $slide.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    $text = $reader.ReadToEnd()
    
    # Simple regex to remove xml tags
    $cleanText = $text -replace '<[^>]+>', ' '
    $cleanText = $cleanText -replace '\s+', ' '
    
    Write-Output "--- Slide $slideNum ---"
    Write-Output $cleanText.Trim()
    
    $reader.Close()
}
$zip.Dispose()
