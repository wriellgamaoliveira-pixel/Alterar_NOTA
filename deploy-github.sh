#!/bin/bash

echo "=========================================="
echo "  Portal Fiscal XML - Deploy no GitHub"
echo "=========================================="
echo ""

# Verifica se foi passado o nome de usuario
if [ -z "$1" ]; then
    echo "Uso: ./deploy-github.sh SEU-USUARIO-GITHUB"
    echo "Exemplo: ./deploy-github.sh joaosilva"
    exit 1
fi

USERNAME=$1

echo "[1/5] Inicializando repositorio git..."
git init

echo "[2/5] Adicionando arquivos..."
git add .

echo "[3/5] Criando commit..."
git commit -m "Primeiro commit - Portal Fiscal XML"

echo "[4/5] Conectando ao GitHub..."
git remote add origin "https://github.com/$USERNAME/portal-fiscal-xml.git"

echo "[5/5] Enviando para o GitHub..."
git push -u origin main 2>/dev/null || git push -u origin master

echo ""
echo "=========================================="
echo "  Pronto! Agora configure no GitHub:"
echo ""
echo "  1. Acesse: https://github.com/$USERNAME/portal-fiscal-xml"
echo "  2. Va em Settings > Pages"
echo "  3. Em 'Source', selecione 'GitHub Actions'"
echo "  4. O deploy sera feito automaticamente!"
echo ""
echo "  Seu site estara em:"
echo "  https://$USERNAME.github.io/portal-fiscal-xml/"
echo "=========================================="
