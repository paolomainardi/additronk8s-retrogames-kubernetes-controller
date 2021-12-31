import * as path from "path";
import * as fs from "fs";
import * as util from "./util.js";

/**
 *
 * @param {*} files
 * @param {*} gameObject
 */
const createConfigMapsSpec = async (files, gameObject) => {
  let configmaps = [];
  let index = 0;
  for (const file of files) {
    let filename = path.basename(file).toLowerCase();
    let data = await fs.promises.readFile(file, { encoding: "base64" });
    let configmap = {
      metadata: {
        name: `${gameObject.metadata.name}-${index}`,
      },
      binaryData: {
        [filename]: data,
      },
    };
    configmaps.push(configmap);
    index++;
  }
  return configmaps;
};

/**
 *
 * @param {*} gameObject
 */
export async function downloadAndCreateConfigmapsSpec(gameObject) {
  try {
    const path = await util.download(gameObject);
    const files = await util.splitFile(path);
    const configmaps = await createConfigMapsSpec(files, gameObject);
    return configmaps;
  } catch (e) {
    throw e;
  }
}

/**
 *
 * @param {*} gameObject
 */
const createServiceSpec = (gameObject) => {
  const name = gameObject.metadata.name;
  const service = {
    metadata: {
      name: name,
      labels: {
        app: name,
      },
    },
    spec: {
      selector: {
        app: name,
      },
      ports: [
        {
          name: "vnc",
          protocol: "TCP",
          port: 8080,
          containerPort: 8080,
        },
        {
          name: "audio",
          protocol: "TCP",
          port: 8081,
          containerPort: 8081,
        },
      ],
    },
  };
  return service;
};

/**
 *
 * @param {*} name
 * @param {*} configmaps
 */
const createDeploymentSpec = (gameObject, configmaps) => {
  const name = gameObject.metadata.name;
  const deployment = {
    metadata: {
      name: name,
      labels: {
        app: name,
      },
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: {
          app: name,
        },
      },
      template: {
        metadata: {
          labels: {
            app: name,
          },
        },
        spec: {
          initContainers: [
            {
              name: "hydrate-game",
              image: "ghcr.io/paolomainardi/additronk8s-game-engine:latest",
              imagePullPolicy: "Always",
              command: [
                "bash",
                "-c",
                "cd /split && ls | sort -n | xargs cat > /games/game.zip && cd /games && unzip game.zip && rm game.zip",
              ],
            },
          ],
          containers: [
            {
              name: "game-engine",
              image: "ghcr.io/paolomainardi/additronk8s-game-engine:latest",
              imagePullPolicy: "Always",
              env: [
                {
                  name: "GAME_DIR",
                  value: gameObject.spec.dir,
                },
                {
                  name: "GAME_EXE",
                  value: gameObject.spec.exe,
                },
                {
                  name: "DISPLAY_SETTINGS",
                  value: "1024x768x24",
                },
              ],
              ports: [
                {
                  containerPort: 8080,
                  containerPort: 8081,
                },
              ],
            },
          ],
        },
      },
    },
  };
  const deploymentWithVolumes = addDeploymentVolumes(deployment, configmaps);
  return deploymentWithVolumes;
};

/**
 *
 * @param {*} deployment
 * @param {*} configmaps
 */
const addDeploymentVolumes = (deployment, configmaps) => {
  const deploymentClone = { ...deployment };
  const volumes = [];
  const volumeMounts = [];
  configmaps.forEach((configmap, key) => {
    volumes.push({
      name: `configmap-volume-${key}`,
      configMap: {
        name: configmap.configmapName,
        items: [
          {
            key: configmap.filename,
            path: configmap.filename,
          },
        ],
      },
    });
    volumeMounts.push({
      name: `configmap-volume-${key}`,
      mountPath: `/split/${key}`,
      subPath: configmap.filename,
    });
  });

  // Add the final game volume.
  const gamesVolume = {
    name: `games-volume`,
    emptyDir: {},
  };
  const gamesVolumeMount = {
    name: "games-volume",
    mountPath: "/games",
  };
  volumes.push(gamesVolume);
  volumeMounts.push(gamesVolumeMount);

  // Add all volumes to the init container.
  deploymentClone["spec"]["template"]["spec"]["volumes"] = volumes;
  deploymentClone["spec"]["template"]["spec"]["initContainers"][0][
    "volumeMounts"
  ] = volumeMounts;

  // Add only the game volume to the game engine.
  deploymentClone["spec"]["template"]["spec"]["containers"][0][
    "volumeMounts"
  ] = [gamesVolumeMount];

  return deploymentClone;
};

/**
 *
 * @param {*} gameUrl
 * @param {*} machine
 */
export const saveGame = async (gameObject, machine) => {
  try {
    await machine.event({
      reason: "Downloading",
      message: `Starting to download game "${gameObject.spec.name}" from: ${gameObject.spec.zipUrl}`,
    });

    const configmaps = await downloadAndCreateConfigmapsSpec(gameObject);
    for (const configmap of configmaps) {
      await machine.save("ConfigMap", configmap);
    }

    await machine.event({
      reason: "Downloaded",
      message: `Downloaded and splitted in ${configmaps.length} configmaps`,
    });
    return configmaps;
  } catch (e) {
    await machine.event({
      reason: "Failed",
      type: "Warning",
      message: `Download of game failed cause: ${JSON.stringify(e.message)}`,
    });
    throw e;
  }
};

/**
 *
 * @param {*} machine
 */
export const deployGame = async (gameObject, configmaps, machine) => {
  try {
    const configMapsNames = [];
    configmaps.map((configmap) => {
      const filename = Object.keys(configmap.binaryData).pop();
      configMapsNames.push({
        filename: filename,
        configmapName: configmap.metadata.name,
      });
    });

    // Create deployment.
    const deployment = createDeploymentSpec(gameObject, configMapsNames);
    await machine.save("Deployment", deployment);

    // Create service.
    const service = createServiceSpec(gameObject);
    await machine.save("Service", service);

    await machine.event({
      reason: "Deployed",
      message: `Deployment and service correctly created`,
    });
  } catch (e) {
    await machine.event({
      reason: "Failed",
      type: "Warning",
      message: `Failed to start the game cause: ${JSON.stringify(e.message)}`,
    });
    throw e;
  }
};
