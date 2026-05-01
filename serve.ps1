param(
  [int]$Port = 4173,
  [switch]$NoOpen
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Address = [System.Net.IPAddress]::Parse("127.0.0.1")
$Listener = [System.Net.Sockets.TcpListener]::new($Address, $Port)

$MimeTypes = @{
  ".css" = "text/css; charset=utf-8"
  ".html" = "text/html; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"
  ".svg" = "image/svg+xml"
}

function Send-Response {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$Status,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$Body
  )

  $Header = "HTTP/1.1 $Status $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
  $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($Header)
  $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
  if ($Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
}

try {
  $Listener.Start()
} catch {
  Write-Host "Не удалось запустить сервер на порту $Port. Возможно, порт занят."
  Write-Host $_.Exception.Message
  exit 1
}

$Url = "http://127.0.0.1:$Port/"
Write-Host "WASD Range запущен: $Url"
Write-Host "Чтобы остановить сервер, нажми Ctrl+C."

if (-not $NoOpen) {
  Start-Process $Url
}

try {
  while ($true) {
    $Client = $Listener.AcceptTcpClient()
    try {
      $Stream = $Client.GetStream()
      $Buffer = New-Object byte[] 8192
      $Read = $Stream.Read($Buffer, 0, $Buffer.Length)
      if ($Read -le 0) {
        continue
      }

      $RequestText = [System.Text.Encoding]::ASCII.GetString($Buffer, 0, $Read)
      $RequestLine = ($RequestText -split "`r?`n")[0]
      $Parts = $RequestLine -split " "
      if ($Parts.Length -lt 2) {
        $Body = [System.Text.Encoding]::UTF8.GetBytes("Bad request")
        Send-Response $Stream 400 "Bad Request" "text/plain; charset=utf-8" $Body
        continue
      }

      $Path = [System.Uri]::UnescapeDataString($Parts[1].Split("?")[0])
      if ($Path -eq "/") {
        $Path = "/index.html"
      }

      $Relative = $Path.TrimStart("/") -replace "/", [System.IO.Path]::DirectorySeparatorChar
      $FullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, $Relative))
      $RootPath = [System.IO.Path]::GetFullPath($Root)

      if (-not $FullPath.StartsWith($RootPath) -or -not [System.IO.File]::Exists($FullPath)) {
        $Body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
        Send-Response $Stream 404 "Not Found" "text/plain; charset=utf-8" $Body
        continue
      }

      $Extension = [System.IO.Path]::GetExtension($FullPath)
      $ContentType = $MimeTypes[$Extension]
      if (-not $ContentType) {
        $ContentType = "application/octet-stream"
      }

      $BodyBytes = [System.IO.File]::ReadAllBytes($FullPath)
      Send-Response $Stream 200 "OK" $ContentType $BodyBytes
    } catch {
      try {
        $Body = [System.Text.Encoding]::UTF8.GetBytes("Server error")
        Send-Response $Stream 500 "Internal Server Error" "text/plain; charset=utf-8" $Body
      } catch {
      }
    } finally {
      $Client.Close()
    }
  }
} finally {
  $Listener.Stop()
}
