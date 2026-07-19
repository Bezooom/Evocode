#!/bin/bash
set -e

ENVIRONMENT=$1
echo "=== Deploying to $ENVIRONMENT ==="

# Check environment
if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: deploy.sh [staging|production]"
    exit 1
fi

# Deploy to staging
if [ "$ENVIRONMENT" = "staging" ]; then
    echo "Deploying to staging..."
    # Add staging deployment logic
    echo "✅ Staging deployment completed"
    
# Deploy to production
elif [ "$ENVIRONMENT" = "production" ]; then
    echo "Deploying to production..."
    # Add production deployment logic
    echo "✅ Production deployment completed"
else
    echo "Unknown environment: $ENVIRONMENT"
    echo "Usage: deploy.sh [staging|production]"
    exit 1
fi

echo "=== Deployment completed ==="
