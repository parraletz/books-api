# Plan: Helm Validation with ArgoCD valuesObject and Kyverno CLI

## Overview
Add a validation step to the CI pipeline that extracts valuesObject from ArgoCD configuration, renders Helm templates using those values, and validates the resulting Kubernetes manifests with Kyverno CLI.

## Current State Analysis
- ✅ CI workflow exists in `.github/workflows/ci.yml`
- ✅ GitOps configurations in `gitops/` (values-staging.yaml, values-production.yaml)
- ✅ Helm charts in `helm/books-api/`
- ❌ ArgoCD config `gitops/books.yaml` is empty
- ❌ No Kyverno policies defined
- ❌ No Helm validation step in CI

## Implementation Plan

### Phase 1: ArgoCD Configuration Setup
1. **Create proper ArgoCD Application config** (`gitops/books.yaml`)
   - Download gitops repo to local directory

### Phase 2: Kyverno Policies
1. **Create Kyverno policies directory** (`gitops/kyverno-policies/`)
   - Security policies (non-root, read-only filesystem)
   - Resource limits policies
   - Network policies
   - Image security policies

### Phase 3: CI Workflow Enhancement
1. **Add Helm validation job** to `.github/workflows/ci.yml`
   - Setup Helm and Kyverno CLI
   - Extract valuesObject from ArgoCD config
   - Create temporary values file
   - Render Helm templates
   - Validate with Kyverno
   - Cleanup temporary files

### Phase 4: Testing & Validation
1. **Test validation pipeline**
   - Verify valuesObject extraction
   - Test Helm template rendering
   - Validate Kyverno policy enforcement
   - Check CI integration

## Detailed Implementation

### 1. ArgoCD Application Configuration
```yaml
# gitops/books.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: books-api
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/parraletz/books-api
    targetRevision: HEAD
    path: helm/books-api
    helm:
      valuesObject:
        image:
          repository: ghcr.io/parraletz/books-api
          pullPolicy: IfNotPresent
          tag: "1.0.0"
        replicaCount: 2
        service:
          type: ClusterIP
          port: 80
          targetPort: 3000
        # ... additional values
  destination:
    server: https://kubernetes.default.svc
    namespace: books-api
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### 2. Kyverno Policies Structure
```
gitops/kyverno-policies/
├── security.yaml          # Security context policies
├── resources.yaml         # Resource limits policies
├── networking.yaml        # Network policies
├── images.yaml           # Image security policies
└── best-practices.yaml   # General best practices
```

### 3. CI Workflow Step
```yaml
helm-kyverno-validation:
  name: Helm Template & Kyverno Validation
  runs-on: ubuntu-latest
  needs: test
  
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Helm
      uses: azure/setup-helm@v3
      with:
        version: v3.12.0
    
    - name: Install yq (YAML processor)
      run: |
        sudo wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/download/v4.35.2/yq_linux_amd64
        sudo chmod +x /usr/local/bin/yq
    
    - name: Install Kyverno CLI
      run: |
        curl -sSfL https://github.com/kyverno/kyverno/releases/download/v1.11.0/kyverno-cli_v1.11.0_linux_x86_64.tar.gz -o kyverno.tar.gz
        tar -xzf kyverno.tar.gz
        sudo mv kyverno /usr/local/bin/
        kyverno version
    
    - name: Extract ArgoCD valuesObject
      id: extract-values
      run: |
        # Determine environment based on branch
        if [[ "${{ github.ref_name }}" == "main" ]]; then
          ENV="production"
        else
          ENV="staging"
        fi
        
        echo "Environment: $ENV"
        
        # Extract valuesObject from ArgoCD config
        if [ -f "gitops/books.yaml" ]; then
          yq eval '.spec.source.helm.valuesObject' gitops/books.yaml > temp-values.yaml
          echo "✅ Extracted valuesObject from ArgoCD config"
        else
          echo "❌ ArgoCD config not found"
          exit 1
        fi
        
        # Merge with environment-specific values if exists
        if [ -f "gitops/values-$ENV.yaml" ]; then
          yq eval-all 'select(fileIndex == 0) * select(fileIndex == 1)' \
            temp-values.yaml gitops/values-$ENV.yaml > merged-values.yaml
          mv merged-values.yaml temp-values.yaml
          echo "✅ Merged with $ENV values"
        fi
        
        # Display final values
        echo "Final values to be used:"
        cat temp-values.yaml
        
        echo "env=$ENV" >> $GITHUB_OUTPUT
    
    - name: Validate Helm chart syntax
      run: |
        echo "🔍 Validating Helm chart syntax..."
        helm lint ./helm/books-api --values temp-values.yaml
    
    - name: Render Helm templates
      run: |
        echo "📋 Rendering Helm templates..."
        helm template books-api ./helm/books-api \
          --values temp-values.yaml \
          --output-dir rendered-manifests \
          --debug
        
        echo "✅ Templates rendered to rendered-manifests/"
        echo "Generated files:"
        find rendered-manifests -name "*.yaml" -type f | head -10
    
    - name: Validate with Kyverno CLI
      run: |
        echo "🛡️ Validating with Kyverno policies..."
        
        # Create policy directory if it doesn't exist
        mkdir -p gitops/kyverno-policies
        
        # Apply Kyverno validation if policies exist
        if [ -d "gitops/kyverno-policies" ] && [ "$(ls -A gitops/kyverno-policies)" ]; then
          kyverno validate rendered-manifests/books-api/templates/ \
            --policy gitops/kyverno-policies/ \
            --values temp-values.yaml
          echo "✅ Kyverno validation passed"
        else
          echo "⚠️ No Kyverno policies found, skipping validation"
        fi
    
    - name: Generate validation report
      if: always()
      run: |
        echo "## 📊 Validation Report" >> $GITHUB_STEP_SUMMARY
        echo "" >> $GITHUB_STEP_SUMMARY
        echo "**Environment:** ${{ steps.extract-values.outputs.env }}" >> $GITHUB_STEP_SUMMARY
        echo "**Helm Chart:** books-api" >> $GITHUB_STEP_SUMMARY
        echo "" >> $GITHUB_STEP_SUMMARY
        
        if [ -d "rendered-manifests/books-api/templates" ]; then
          MANIFEST_COUNT=$(find rendered-manifests/books-api/templates -name "*.yaml" -type f | wc -l)
          echo "**Manifests Generated:** $MANIFEST_COUNT" >> $GITHUB_STEP_SUMMARY
        fi
        
        if [ -d "gitops/kyverno-policies" ] && [ "$(ls -A gitops/kyverno-policies)" ]; then
          POLICY_COUNT=$(find gitops/kyverno-policies -name "*.yaml" -type f | wc -l)
          echo "**Kyverno Policies:** $POLICY_COUNT" >> $GITHUB_STEP_SUMMARY
        else
          echo "**Kyverno Policies:** None configured" >> $GITHUB_STEP_SUMMARY
        fi
        
        echo "" >> $GITHUB_STEP_SUMMARY
        echo "### 📁 Generated Files" >> $GITHUB_STEP_SUMMARY
        if [ -d "rendered-manifests/books-api/templates" ]; then
          find rendered-manifests/books-api/templates -name "*.yaml" -type f | \
            sed 's|.*|- |' >> $GITHUB_STEP_SUMMARY
        fi
    
    - name: Upload validation artifacts
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: helm-validation-${{ steps.extract-values.outputs.env }}
        path: |
          rendered-manifests/
          temp-values.yaml
        retention-days: 7
    
    - name: Cleanup temp files
      if: always()
      run: |
        rm -f temp-values.yaml merged-values.yaml
        rm -rf rendered-manifests
```

### 4. Integration Points
- **Position:** After `test` job, before any deployment jobs
- **Dependencies:** Requires `test` job to pass
- **Triggers:** Runs on push to main/develop and pull requests
- **Failure Behavior:** Blocks deployment if validation fails

## Benefits

1. **Early Detection:** Catch configuration errors before deployment
2. **Policy Enforcement:** Ensure security and compliance standards
3. **Environment Consistency:** Validate against actual ArgoCD values
4. **CI Integration:** Automated validation in pull requests
5. **Debugging Support:** Artifacts and reports for troubleshooting

## Success Criteria

- ✅ Helm templates render successfully with ArgoCD values
- ✅ Kyverno policies are enforced (if configured)
- ✅ Validation runs in CI pipeline
- ✅ Clear reporting and artifact generation
- ✅ No impact on existing CI workflow

## Next Steps

1. Create `.ai/PLAN.md` for review ✅
2. Implement ArgoCD configuration
3. Create sample Kyverno policies
4. Add validation step to CI workflow
5. Test end-to-end validation pipeline
6. Document usage and troubleshooting

## Dependencies

- `yq` for YAML processing
- `helm` for template rendering
- `kyverno-cli` for policy validation
- Proper ArgoCD valuesObject structure
- Optional: Kyverno policies directory

## Risk Mitigation

- **Missing ArgoCD config:** Graceful error handling
- **Missing policies:** Skip Kyverno validation with warning
- **Template errors:** Detailed error reporting
- **Tool failures:** Clear installation and version checks
