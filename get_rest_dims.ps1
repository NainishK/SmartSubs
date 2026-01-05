Add-Type -AssemblyName System.Drawing
$files = @("spending.png", "subscriptions.png")
foreach ($f in $files) {
    $img = [System.Drawing.Image]::FromFile("C:\Personal\Projects\Subscription-manager\frontend\public\screenshots\$f")
    Write-Output "$f Width: $($img.Width) Height: $($img.Height)"
    $img.Dispose()
}
