#!/bin/bash
# Test script to validate ArgoCD valuesObject extraction

set -e

echo "🔍 Testing ArgoCD valuesObject extraction..."

# Check if required files exist
if [ ! -f "gitops/books.yaml" ]; then
    echo "❌ ArgoCD config not found: gitops/books.yaml"
    exit 1
fi

if [ ! -f "helm/books-api/values.yaml" ]; then
    echo "❌ Helm values not found: helm/books-api/values.yaml"
    exit 1
fi

# Extract valuesObject using Python (since yq is not available)
echo "📋 Extracting valuesObject from ArgoCD config..."
python3 -c "
import yaml
import sys

try:
    with open('gitops/books.yaml', 'r') as f:
        data = yaml.safe_load(f)
    
    values_object = data['spec']['source']['helm']['valuesObject']
    
    # Output as YAML for temp values file
    yaml.dump(values_object, sys.stdout, default_flow_style=False)
    
except Exception as e:
    print(f'Error: {e}', file=sys.stderr)
    sys.exit(1)
" > temp-values.yaml

echo "✅ valuesObject extracted to temp-values.yaml"

# Test Helm template rendering with extracted values
echo "🎯 Testing Helm template rendering..."
if helm template books-api ./helm/books-api --values temp-values.yaml --dry-run=client > /dev/null 2>&1; then
    echo "✅ Helm template rendering successful"
else
    echo "❌ Helm template rendering failed"
    exit 1
fi

# Show some key values from the extracted config
echo "📊 Key values extracted:"
echo "  - Image tag: $(python3 -c "import yaml; data=yaml.safe_load(open('temp-values.yaml')); print(data['image']['tag'])")"
echo "  - Replicas: $(python3 -c "import yaml; data=yaml.safe_load(open('temp-values.yaml')); print(data['replicaCount'])")"
echo "  - Service type: $(python3 -c "import yaml; data=yaml.safe_load(open('temp-values.yaml')); print(data['service']['type'])")"

# Cleanup
rm -f temp-values.yaml

echo "✅ ArgoCD valuesObject extraction test completed successfully!"