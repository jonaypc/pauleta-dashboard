#!/bin/bash
# Script para forzar redeploy en Vercel

echo "🚀 Forzando redeploy en Vercel..."
echo ""

# Crear un commit vacío para trigger deploy
git commit --allow-empty -m "chore: force redeploy for rectificativas button

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push

echo ""
echo "✅ Push realizado. Vercel debería iniciar deploy en ~30 segundos"
echo ""
echo "Verifica en: https://vercel.com/dashboard"
echo ""
echo "Espera 2-3 minutos y luego:"
echo "  1. Ctrl+Shift+R en tu navegador"
echo "  2. Prueba de nuevo a abrir una factura emitida"
