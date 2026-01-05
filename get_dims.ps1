Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("C:\Personal\Projects\Subscription-manager\frontend\public\screenshots\unused_alert.png")
Write-Output "Width: $($img.Width) Height: $($img.Height)"
$img.Dispose()
