# Script PowerShell para ejecutar la migración de Facturas Rectificativas
# Uso: .\ejecutar-migracion-rectificativas.ps1

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "MIGRACIÓN: Facturas Rectificativas" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Leer el archivo de migración
$migrationFile = "supabase/migrations/20260806000000_facturas_rectificativas.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Error: No se encuentra el archivo de migración" -ForegroundColor Red
    Write-Host "   Ruta esperada: $migrationFile" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Archivo de migración encontrado" -ForegroundColor Green
Write-Host ""

# Instrucciones
Write-Host "OPCIONES PARA EJECUTAR LA MIGRACIÓN:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. DASHBOARD DE SUPABASE (Más fácil):" -ForegroundColor White
Write-Host "   • Ve a: https://supabase.com/dashboard" -ForegroundColor Gray
Write-Host "   • Abre tu proyecto Pauleta Canaria" -ForegroundColor Gray
Write-Host "   • SQL Editor → New Query" -ForegroundColor Gray
Write-Host "   • Copia el contenido del archivo y ejecuta" -ForegroundColor Gray
Write-Host ""
Write-Host "2. SUPABASE CLI:" -ForegroundColor White
Write-Host "   npx supabase db push" -ForegroundColor Gray
Write-Host ""
Write-Host "3. COPIAR AL PORTAPAPELES (presiona Enter para continuar):" -ForegroundColor White

$null = Read-Host

# Leer contenido y copiar al portapapeles
try {
    $content = Get-Content $migrationFile -Raw -Encoding UTF8
    Set-Clipboard -Value $content
    Write-Host ""
    Write-Host "✓ ¡SQL copiado al portapapeles!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ahora:" -ForegroundColor Cyan
    Write-Host "1. Ve a https://supabase.com/dashboard" -ForegroundColor White
    Write-Host "2. Abre SQL Editor → New Query" -ForegroundColor White
    Write-Host "3. Pega (Ctrl+V) y ejecuta (Ctrl+Enter)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Error al copiar al portapapeles: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "CONTENIDO DE LA MIGRACIÓN:" -ForegroundColor Yellow
    Write-Host "======================================" -ForegroundColor Gray
    Get-Content $migrationFile
    Write-Host "======================================" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Presiona Enter para salir..."
$null = Read-Host
