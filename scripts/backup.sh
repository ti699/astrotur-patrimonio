#!/bin/sh
# Backup do banco e das imagens/documentos. Uso: ./scripts/backup.sh [pasta]
set -e
DEST="${1:-./backups}"
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEST"
docker exec patrimonio_db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$DEST/db-$STAMP.sql.gz"
docker run --rm -v astrotur-patrimonio_uploads:/data -v "$(cd "$DEST" && pwd)":/out alpine \
  tar czf "/out/uploads-$STAMP.tar.gz" -C /data .
echo "Backup salvo em $DEST"
