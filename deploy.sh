#!/bin/bash

# --- Configuración ---
PROJECT_ID="gen-lang-client-0246234138"
SERVICE_NAME="starparks-carwash-erp"
REGION="us-west1"

echo "🚀 Iniciando proceso de despliegue para StarParks ERP..."

# 1. Configurar el proyecto de GCP
echo "📍 Configurando proyecto: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# 2. Habilitar servicios necesarios (solo la primera vez)
echo "🔑 Habilitando servicios de Cloud Run y Artifact Registry..."
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# 3. Construir e implementar imagen usando Cloud Build
# Usamos '--source .' para que Google maneje el Dockerfile y suba la imagen automáticamente
echo "🏗️ Construyendo imagen y desplegando en Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --project $PROJECT_ID

echo "✅ Proceso finalizado."
echo "🔗 Si el despliegue fue exitoso, verás la URL arriba."
