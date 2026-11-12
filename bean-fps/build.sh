#!/bin/sh
# src/page.html (wersja na CDN) -> index.html (lokalna, z vendor/three)
cd "$(dirname "$0")"
{ printf '<!doctype html>\n<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>\n';
  sed 's#https://cdn.jsdelivr.net/npm/three@0.170.0/#./vendor/three/#g' src/page.html;
  printf '</body></html>\n'; } > index.html
