import * as k8s from "@kubernetes/client-node";
import * as crdInformer from "./lib/crd-informer.js";

// Connnect to k8s apis.
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

console.log("\nWelcome to the Additron Machine\n");

// Start the informers.
crdInformer.start(kc, k8s);
