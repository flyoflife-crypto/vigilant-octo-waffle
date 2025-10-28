param(
  [string]$ImportsFile = "imports_list.txt",
  [switch]$Build = $true
)

function Get-RootFromImport([string]$s) {
  # ожидает строку вида: import ... from 'pkg/sub' или "pkg/sub"
  if ($s -match "from\s+['""]([^'""]+)['""]") {
    $pkg = $Matches[1]
  } elseif ($s -match "import\s+['""]([^'""]+)['""]") {
    $pkg = $Matches[1]
  } else {
    return $null
  }

  # отбрасываем относительные/alias
  if ($pkg.StartsWith("./") -or $pkg.StartsWith("../") -or $pkg.StartsWith("@/")) {
    return $null
  }

  # если scope-пакет (@scope/name) — корень это две части
  if ($pkg.StartsWith("@")) {
    $parts = $pkg.Split("/")
    if ($parts.Count -ge 2) {
      return "$($parts[0])/$($parts[1])"
    }
  }

  # иначе берем первую часть до слеша
  return $pkg.Split("/")[0]
}

if (-not (Test-Path "package.json")) {
  Write-Host "package.json not found in current directory." -ForegroundColor Red
  exit 1
}

# Считываем package.json
$pkgJson = Get-Content package.json -Raw | ConvertFrom-Json
$deps = @{}
if ($pkgJson.dependencies)     { $pkgJson.dependencies.PSObject.Properties | ForEach-Object { $deps[$_.Name] = $_.Value } }
if ($pkgJson.devDependencies)  { $pkgJson.devDependencies.PSObject.Properties | ForEach-Object { $deps[$_.Name] = $_.Value } }

# БАЗОВЫЙ СПИСОК, который нам точно нужен (из твоего стека)
$baseline = @(
  "react","react-dom","next",
  "lucide-react",
  "class-variance-authority","tailwind-merge","tailwindcss","tailwindcss-animate",
  "react-markdown","remark-gfm",
  "recharts",
  "embla-carousel-react",
  "react-hook-form",
  "next-themes",
  "react-day-picker",
  "html-to-image",
  "@radix-ui/react-slot",
  "@radix-ui/react-accordion","@radix-ui/react-alert-dialog","@radix-ui/react-aspect-ratio",
  "@radix-ui/react-avatar","@radix-ui/react-checkbox","@radix-ui/react-collapsible",
  "@radix-ui/react-context-menu","@radix-ui/react-dialog","@radix-ui/react-dropdown-menu",
  "@radix-ui/react-hover-card","@radix-ui/react-label","@radix-ui/react-menubar",
  "@radix-ui/react-navigation-menu","@radix-ui/react-popover","@radix-ui/react-progress",
  "@radix-ui/react-radio-group","@radix-ui/react-scroll-area","@radix-ui/react-select",
  "@radix-ui/react-separator","@radix-ui/react-slider","@radix-ui/react-switch",
  "@radix-ui/react-tabs","@radix-ui/react-toast","@radix-ui/react-toggle-group","@radix-ui/react-tooltip"
)

$needed = [System.Collections.Generic.HashSet[string]]::new()
$baseline | ForEach-Object { [void]$needed.Add($_) }

# Если есть файл импортов — дополнительно распарсим
if (Test-Path $ImportsFile) {
  Get-Content $ImportsFile | ForEach-Object {
    $root = Get-RootFromImport $_
    if ($null -ne $root) { [void]$needed.Add($root) }
  }
}

# Отсеем то, что уже стоит (по package.json)
$toInstall = @()
foreach ($name in $needed) {
  if (-not $deps.ContainsKey($name)) {
    $toInstall += $name
  }
}

if ($toInstall.Count -eq 0) {
  Write-Host "✅ Все зависимости уже установлены по package.json." -ForegroundColor Green
} else {
  Write-Host "📦 Устанавливаю недостающие:" ($toInstall -join ", ")
  npm i $toInstall
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Install failed. See errors above." -ForegroundColor Red
    exit 1
  }
}

if ($Build) {
  if (Test-Path .next) { Remove-Item .next -Recurse -Force }
  if (Test-Path out)   { Remove-Item out   -Recurse -Force }
  npm run build:web
}
