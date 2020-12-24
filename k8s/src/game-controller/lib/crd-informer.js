import { createApiMachinery } from "./api-machinery.js";
import { saveGame, deployGame } from "./game-engine.js";

/**
 * @param {import('@kubernetes/client-node').KubeConfig} kc - Kubeconfig
 * @param {import('@kubernetes/client-node')} k8s - K8s
 */
export const start = (kc, k8s) => {
  const machine = createApiMachinery(kc, k8s);
  const crdInformer = machine.createCrdInformer();

  crdInformer.on("add", async (gameObject) => {
    try {
      if (process.env.DEBUG) {
        console.log(JSON.stringify(gameObject, null, 2));
      }
      // TODO: Check if this game already exists.
      machine.setOwner(gameObject);

      // Get default variables.
      const name = gameObject.spec.name;

      // Download and save game.
      console.log(`Reading cloud floppy disks of "${name}" in progress... 💾`);
      const configmaps = await saveGame(gameObject, machine);

      // Deploy game.
      console.log(`Great! Game downloaded, now saving it locally.... ⌛`);
      await deployGame(gameObject, configmaps, machine);

      console.log(`Game ready... 🕹️`);

      // Mark as ready.
      await machine.updateStatus("Ready");
    } catch (e) {
      try {
        await machine.updateStatus("Error");
      } catch (e) {
        console.error("Cannot update the status.");
      } finally {
        e.response?.body?.message
          ? console.error(e.response.body.message)
          : console.error(e);
      }
    }
  });

  // TODO: Handle CRD updates.
  crdInformer.on("update", async (obj) => {
    if (process.env.DEBUG) {
      console.log(JSON.stringify(gameObject, null, 2));
    }
  });

  // TODO: Handle CRD deletes.
  crdInformer.on("delete", async (obj) => {
    if (process.env.DEBUG) {
      console.log(JSON.stringify(gameObject, null, 2));
    }
  });

  crdInformer.start();
};
