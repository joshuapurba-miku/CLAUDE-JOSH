<#
  analisis-laptop.ps1  -  HANYA MENGANALISIS, TIDAK MENGHAPUS APA PUN.

  Cara pakai (PowerShell, sebaiknya "Run as Administrator"):
    Set-ExecutionPolicy -Scope Process Bypass -Force
    .\analisis-laptop.ps1                          # default: D:\Download, 90 hari
    .\analisis-laptop.ps1 -Path "D:\Download" -Days 180

  Hasil disimpan di folder "Analisis_Laptop" di Desktop:
    - ringkasan.txt          -> salin isinya ke Claude untuk dianalisis
    - download_lama.csv      -> daftar lengkap file lama (bisa dibuka di Excel)
    - aplikasi_terpasang.csv -> daftar aplikasi + ukuran + tanggal install
#>
param(
    [string]$Path = "D:\Download",
    [int]$Days = 90
)

$ErrorActionPreference = "SilentlyContinue"
$out = Join-Path ([Environment]::GetFolderPath("Desktop")) "Analisis_Laptop"
New-Item $out -ItemType Directory -Force | Out-Null
$report = Join-Path $out "ringkasan.txt"
$batas = (Get-Date).AddDays(-$Days)

function MB($bytes) { [math]::Round($bytes / 1MB, 1) }
function Size-Of($dir) {
    if (-not (Test-Path $dir)) { return 0 }
    $s = (Get-ChildItem $dir -Recurse -File -Force | Measure-Object Length -Sum).Sum
    if ($s) { $s } else { 0 }
}

$kategori = @{
    "Excel/CSV"      = ".xlsx", ".xls", ".xlsm", ".xlsb", ".csv"
    "PDF"            = ".pdf"
    "Word/PPT"       = ".doc", ".docx", ".ppt", ".pptx"
    "Gambar"         = ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".heic"
    "Video/Audio"    = ".mp4", ".mkv", ".avi", ".mov", ".mp3", ".wav", ".m4a"
    "Installer"      = ".exe", ".msi", ".msix", ".appx", ".apk", ".iso"
    "Arsip"          = ".zip", ".rar", ".7z", ".tar", ".gz"
}
function Get-Kategori($ext) {
    $e = $ext.ToLower()
    foreach ($k in $kategori.Keys) { if ($kategori[$k] -contains $e) { return $k } }
    return "Lainnya"
}

"=== ANALISIS LAPTOP - $(Get-Date -Format 'yyyy-MM-dd HH:mm') ===" | Set-Content $report -Encoding UTF8

# ---------- 1. FILE DOWNLOAD LAMA ----------
"`n=== 1. FILE DI $Path YANG TIDAK DIUBAH > $Days HARI ===" | Add-Content $report
if (-not (Test-Path $Path)) {
    "Folder $Path tidak ditemukan." | Add-Content $report
} else {
    $semua = Get-ChildItem $Path -File -Recurse -Force
    $lama = $semua | Where-Object { $_.LastWriteTime -lt $batas } | ForEach-Object {
        [pscustomobject]@{
            Kategori      = Get-Kategori $_.Extension
            Nama          = $_.Name
            MB            = MB $_.Length
            TerakhirUbah  = $_.LastWriteTime.ToString("yyyy-MM-dd")
            Lokasi        = $_.FullName
        }
    }
    $lama | Sort-Object MB -Descending | Export-Csv (Join-Path $out "download_lama.csv") -NoTypeInformation -Encoding UTF8

    "Total file di folder : $($semua.Count) ($(MB ($semua | Measure-Object Length -Sum).Sum) MB)" | Add-Content $report
    "File lama (> $Days hr): $(@($lama).Count) ($([math]::Round(($lama | Measure-Object MB -Sum).Sum,1)) MB)" | Add-Content $report
    "`n-- Per jenis file --" | Add-Content $report
    $lama | Group-Object Kategori | ForEach-Object {
        [pscustomobject]@{
            Kategori  = $_.Name
            JumlahFile = $_.Count
            TotalMB   = [math]::Round(($_.Group | Measure-Object MB -Sum).Sum, 1)
        }
    } | Sort-Object TotalMB -Descending | Format-Table -AutoSize | Out-String -Width 200 | Add-Content $report

    "-- 30 file lama terbesar --" | Add-Content $report
    $lama | Sort-Object MB -Descending | Select-Object -First 30 Kategori, Nama, MB, TerakhirUbah |
        Format-Table -AutoSize | Out-String -Width 250 | Add-Content $report
}

# ---------- 2. FILE SAMPAH / TEMP ----------
"`n=== 2. FILE SAMPAH (TEMP & CACHE) ===" | Add-Content $report
$lokal = $env:LOCALAPPDATA
$temp = [ordered]@{
    "Temp user"                 = $env:TEMP
    "Temp Windows"              = "C:\Windows\Temp"
    "Cache Windows Update"      = "C:\Windows\SoftwareDistribution\Download"
    "Cache Chrome"              = "$lokal\Google\Chrome\User Data\Default\Cache"
    "Cache Edge"                = "$lokal\Microsoft\Edge\User Data\Default\Cache"
    "Crash dump"                = "$lokal\CrashDumps"
    "Thumbnail cache"           = "$lokal\Microsoft\Windows\Explorer"
    "Downloads di C:"           = "$env:USERPROFILE\Downloads"
    "Recycle Bin (C:)"          = "C:\`$Recycle.Bin"
    "Recycle Bin (D:)"          = "D:\`$Recycle.Bin"
}
$totalTemp = 0
$temp.GetEnumerator() | ForEach-Object {
    $s = Size-Of $_.Value
    if ($_.Key -ne "Downloads di C:") { $totalTemp += $s }
    [pscustomobject]@{ Lokasi = $_.Key; MB = MB $s; Path = $_.Value }
} | Format-Table -AutoSize | Out-String -Width 250 | Add-Content $report
"Perkiraan total sampah yang bisa dibersihkan: $(MB $totalTemp) MB" | Add-Content $report

# ---------- 3. RUANG DISK ----------
"`n=== 3. RUANG DISK ===" | Add-Content $report
Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -ne $null } | ForEach-Object {
    [pscustomobject]@{ Drive = $_.Name; TerpakaiGB = [math]::Round($_.Used/1GB,1); SisaGB = [math]::Round($_.Free/1GB,1) }
} | Format-Table -AutoSize | Out-String | Add-Content $report

# ---------- 4. APLIKASI TERPASANG ----------
"`n=== 4. APLIKASI TERPASANG (urut ukuran) ===" | Add-Content $report
$keys = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
$apps = Get-ItemProperty $keys |
    Where-Object { $_.DisplayName -and -not $_.SystemComponent -and -not $_.ParentKeyName } |
    ForEach-Object {
        [pscustomobject]@{
            Aplikasi     = $_.DisplayName
            Penerbit     = $_.Publisher
            MB           = if ($_.EstimatedSize) { [math]::Round($_.EstimatedSize/1024,1) } else { 0 }
            TglInstall   = $_.InstallDate
        }
    } | Sort-Object Aplikasi -Unique | Sort-Object MB -Descending
$apps | Export-Csv (Join-Path $out "aplikasi_terpasang.csv") -NoTypeInformation -Encoding UTF8
"Jumlah aplikasi: $(@($apps).Count)" | Add-Content $report
$apps | Format-Table -AutoSize | Out-String -Width 250 | Add-Content $report

Write-Host "`nSelesai. Tidak ada file yang dihapus." -ForegroundColor Green
Write-Host "Hasil ada di: $out" -ForegroundColor Green
Write-Host "Salin isi ringkasan.txt ke Claude untuk rekomendasi pembersihan."
Start-Process $out
