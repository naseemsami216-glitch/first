# DevOps Project: Docker -> CI/CD -> Terraform + Kubernetes

Stack: Nginx frontend -> Node.js API -> Postgres + Redis

## Structure
```
backend/            Node API, multi-stage Dockerfile, lint + tests
frontend/           Nginx (unprivileged) static site + reverse proxy
docker-compose.yml  Local run (Task 2)
.github/workflows/  CI/CD pipeline (Task 3)
terraform/          VPC + EKS (Task 4)
k8s/                Manifests: PVC, Ingress, HPA (Task 4)
```

## Task 2 - Containerization
```bash
cp .env.example .env        # set your own password
docker compose up --build   # open http://localhost:8080
docker images               # check small final sizes
```
- Multi-stage: `deps` (prod modules only) -> `test` (lint+tests, not shipped) -> `runtime` (alpine, non-root).
- Layer caching: package.json copied before source; BuildKit npm cache mount.
- Secrets via `.env` (git-ignored), not baked into images.
- Port map: only `8080:8080` is public; backend/DB/Redis sit on internal networks.

## Task 3 - CI/CD (GitHub Actions)
Flow: checkout -> lint -> unit tests -> build & push to GHCR -> deploy -> status report.
- Push to `main` runs everything; PRs run lint + tests only.
- Add repo secret `KUBE_CONFIG_B64` (`base64 -w0 ~/.kube/config`) and an environment named `production`.
- Pipeline metrics are written to the run's **Summary** tab.

## Task 4 - IaC + Kubernetes
### Option A: AWS EKS
```bash
cd terraform
terraform init && terraform plan
terraform apply
$(terraform output -raw kubeconfig_command)
# Ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/aws/deploy.yaml
kubectl apply -f ../k8s/
kubectl -n demo-app get pods,pvc,ingress,hpa
terraform destroy   # when finished (EKS costs money!)
```
### Option B: Minikube (free, local)
```bash
minikube start --cpus 4 --memory 6g
minikube addons enable ingress
minikube addons enable metrics-server
# build images straight into minikube, then set imagePullPolicy: Never / local tags in k8s/
kubectl apply -f k8s/
echo "$(minikube ip) demo.local" | sudo tee -a /etc/hosts
```
### Test autoscaling
```bash
kubectl -n demo-app run load --rm -it --image=busybox -- \
  /bin/sh -c "while true; do wget -qO- http://backend:3000/api/visits; done"
kubectl -n demo-app get hpa -w
```
