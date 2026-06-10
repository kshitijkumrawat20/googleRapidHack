# Memoria AI – Google Cloud Run Deployment Guide

This document explains how to compile, containerize, and deploy the Memoria AI Personal Chief of Staff AI Agent to **Google Cloud Run**.

---

## Prerequisites

1.  **Google Cloud Project**: An active Google Cloud account with a project created and billing enabled.
2.  **Google Cloud CLI (`gcloud`)**: Installed and initialized on your system. Run `gcloud auth login` to authenticate.
3.  **MongoDB Atlas Database**: An active Atlas cluster. Note down your `MONGODB_URI`.
4.  **Google Gemini API Key**: Obtain a key from Google AI Studio.

---

## Step 1: Set Up MongoDB Atlas Vector Search

For semantic memory retrieval to work in production on MongoDB Atlas, you must create a Vector Search Index on the `memories` collection.

1.  Log into **MongoDB Atlas**.
2.  Navigate to your cluster's **Search** section.
3.  Click **Create Search Index** and select **JSON Editor** under **Atlas Vector Search**.
4.  Select your database (e.g., `memoria_ai`) and the `memories` collection.
5.  Paste the following index definition:

```json
{
  "fields": [
    {
      "numDimensions": 768,
      "path": "embedding",
      "similarity": "cosine",
      "type": "vector"
    }
  ]
}
```

6.  Name the index `vector_index` (this must match the name configured in `src/lib/repository.ts`).
7.  Click **Create Search Index**. It will take a few minutes to build.

---

## Step 2: Deploy to Google Cloud Run

Google Cloud Run allows you to deploy containerized applications directly using a single command that builds your image on Google Cloud Build and runs it.

Run the following command in the project root:

```bash
gcloud run deploy memoria-ai \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars="MONGODB_DB=memoria_ai" \
  --set-env-vars="GEMINI_API_KEY=YOUR_GEMINI_API_KEY" \
  --set-env-vars="MONGODB_URI=YOUR_MONGODB_URI"
```

Replace `YOUR_GEMINI_API_KEY` and `YOUR_MONGODB_URI` with your actual secret values.

### Recommended: Using Google Secret Manager

For maximum security in production, do not pass secrets as plaintext environment variables. Instead, store them in **Secret Manager** and reference them:

```bash
gcloud run deploy memoria-ai \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars="MONGODB_DB=memoria_ai" \
  --update-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,MONGODB_URI=MONGODB_URI:latest"
```

---

## Local Container Testing

To build and run the Docker container locally using Docker Compose, make sure your `.env` file or environment is set up and execute:

```bash
docker-compose up --build
```

Access the app locally at `http://localhost:8080`.
