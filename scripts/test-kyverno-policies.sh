#!/bin/bash
# Test script to validate Kyverno policies against Helm templates

set -e

echo "🛡️ Testing Kyverno policies..."

# Check if required tools are available
if ! command -v helm &> /dev/null; then
    echo "❌ Helm is not installed"
    exit 1
fi

echo "⚠️ Using Docker for Kyverno CLI (ARM64 compatible)"
KYVERNO_CMD="docker run --rm -v $(pwd):/workspace -w /workspace ghcr.io/kyverno/kyverno-cli:v1.11.0"

# Check if policies exist
if [ ! -d "gitops/kyverno-policies" ] || [ -z "$(ls -A gitops/kyverno-policies/*.yaml 2>/dev/null)" ]; then
    echo "❌ Kyverno policies not found in gitops/kyverno-policies/"
    exit 1
fi

echo "📋 Kyverno policies found:"
ls -la gitops/kyverno-policies/*.yaml | awk '{print "  - " $9}'

# Extract valuesObject from ArgoCD config
echo "🔍 Extracting valuesObject from ArgoCD config..."
python3 -c "
import yaml
import sys

try:
    with open('gitops/books.yaml', 'r') as f:
        data = yaml.safe_load(f)
    
    values_object = data['spec']['source']['helm']['valuesObject']
    yaml.dump(values_object, sys.stdout, default_flow_style=False)
    
except Exception as e:
    print(f'Error: {e}', file=sys.stderr)
    sys.exit(1)
" > temp-values.yaml

echo "✅ valuesObject extracted to temp-values.yaml"

# Render Helm templates
echo "🎯 Rendering Helm templates..."
helm template books-api ./helm/books-api --values temp-values.yaml --output-dir rendered-manifests

echo "✅ Templates rendered to rendered-manifests/"

# Run Kyverno validation
echo "🛡️ Running Kyverno policy validation..."
if $KYVERNO_CMD apply gitops/kyverno-policies/ --resource rendered-manifests/books-api/templates/deployment.yaml; then
    echo "✅ All Kyverno policies passed for deployment"
else
    echo "❌ Kyverno policy validation failed for deployment"
    exit 1
fi

# Validate all resources
echo "🛡️ Validating all resources..."
for manifest in rendered-manifests/books-api/templates/*.yaml; do
    echo "  - Validating $(basename $manifest)..."
    if $KYVERNO_CMD apply gitops/kyverno-policies/ --resource "$manifest" > /dev/null 2>&1; then
        echo "    ✅ $(basename $manifest) passed"
    else
        echo "    ❌ $(basename $manifest) failed"
        $KYVERNO_CMD apply gitops/kyverno-policies/ --resource "$manifest"
        exit 1
    fi
done

# Show policy summary
echo "📊 Policy Summary:"
echo "  - Policies tested: $(find gitops/kyverno-policies -name "*.yaml" -type f | wc -l)"
echo "  - Manifests validated: $(find rendered-manifests -name "*.yaml" -type f | wc -l)"

# Test specific policies that are most important for books-api
echo ""
echo "🔍 Testing critical policies for books-api..."

# Test security context
echo "  - Security context validation..."
if python3 -c "
import yaml
with open('rendered-manifests/books-api/templates/deployment.yaml', 'r') as f:
    deployment = yaml.safe_load(f)
    
container = deployment['spec']['template']['spec']['containers'][0]
if container.get('securityContext', {}).get('runAsNonRoot') != True:
    print('❌ Container should have runAsNonRoot: true')
    exit(1)
if container.get('securityContext', {}).get('readOnlyRootFilesystem') != True:
    print('❌ Container should have readOnlyRootFilesystem: true')
    exit(1)
    
print('✅ Security context validation passed')
"; then
    echo "    ✅ Security context is properly configured"
else
    echo "    ❌ Security context validation failed"
    exit 1
fi

# Test resource limits
echo "  - Resource limits validation..."
if python3 -c "
import yaml
with open('rendered-manifests/books-api/templates/deployment.yaml', 'r') as f:
    deployment = yaml.safe_load(f)
    
container = deployment['spec']['template']['spec']['containers'][0]
resources = container.get('resources', {})
if 'limits' not in resources:
    print('❌ Container should have resource limits')
    exit(1)
if 'requests' not in resources:
    print('❌ Container should have resource requests')
    exit(1)
    
print('✅ Resource limits validation passed')
"; then
    echo "    ✅ Resource limits are properly configured"
else
    echo "    ❌ Resource limits validation failed"
    exit 1
fi

# Test image security
echo "  - Image security validation..."
if python3 -c "
import yaml
with open('rendered-manifests/books-api/templates/deployment.yaml', 'r') as f:
    deployment = yaml.safe_load(f)
    
container = deployment['spec']['template']['spec']['containers'][0]
image = container.get('image', '')
if not image.startswith('ghcr.io/parraletz/books-api:'):
    print('❌ Image should be ghcr.io/parraletz/books-api:*')
    exit(1)
if ':latest' in image:
    print('❌ Image should not use latest tag')
    exit(1)
    
print('✅ Image security validation passed')
"; then
    echo "    ✅ Image security is properly configured"
else
    echo "    ❌ Image security validation failed"
    exit 1
fi

# Cleanup
rm -f temp-values.yaml
rm -rf rendered-manifests

echo ""
echo "✅ All Kyverno policy tests completed successfully!"
echo "🎉 Books-api meets all security and best practice requirements"