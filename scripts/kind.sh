#!/bin/bash

function init_kind_cluster() {
  create_kind_cluster
  if [ $? -eq 0 ]; then
    create_kind_nginx_ingress_controller
  else
    return 1
  fi
}

function create_kind_nginx_ingress_controller() {
  kubectl config use-context retrogames-k8s-dev
  exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo "Cannot switch to the kind context, exiting..."
    return $exit_code
  fi
  echo "Installing nginx ingress controller...."
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/master/deploy/static/provider/kind/deploy.yaml
}

function create_kind_cluster() {
  cat <<EOF | kind create cluster --wait 5m --name retrogames-k8s-dev --config=-

EOF
  exit_code=$?
  if [ $exit_code -ne 0 ]; then
    return $exit_code
  fi
  kubectl cluster-info --context kind-retrogames-k8s-dev
}
