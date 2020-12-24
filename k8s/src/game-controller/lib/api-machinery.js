import * as util from "./util.js";

export const createApiMachinery = (kc, k8s) => {
  /**
   * @type {import('@kubernetes/client-node').CustomObjectsApi}
   */
  const customApi = kc.makeApiClient(k8s.CustomObjectsApi);

  /**
   * @type {import('@kubernetes/client-node').CoreV1Api}
   */
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);

  /**
   * @type {import('@kubernetes/client-node').AppsV1Api}
   */
  const appsApi = kc.makeApiClient(k8s.AppsV1Api);

  const apiMachinery = {
    setOwner: function (owner) {
      if (!owner) {
        throw `Owner cannot be empty`;
      }
      this.owner = owner;
    },

    /**
     *
     */
    createCrdInformer: function () {
      return k8s.makeInformer(
        kc,
        "/apis/retro.sparkfabrik.com/v1/games",
        () => {
          return customApi.listClusterCustomObject(
            "retro.sparkfabrik.com",
            "v1",
            "games"
          );
        }
      );
    },

    updateStatus: async function (status) {
      const options = {
        headers: { "Content-type": k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH },
      };
      return await customApi.patchNamespacedCustomObjectStatus(
        "retro.sparkfabrik.com",
        "v1",
        this.owner.metadata.namespace,
        "games",
        this.owner.metadata.name,
        [
          {
            op: "replace",
            path: "/status",
            value: {
              gameState: status,
            },
          },
        ],
        undefined,
        undefined,
        undefined,
        options
      );
    },

    /**
     *
     * @param {*} configmap
     */
    saveConfigMap: async function (configmap) {
      return await coreApi.createNamespacedConfigMap(
        this.owner.metadata.namespace,
        configmap
      );
    },

    /**
     *
     * @param {*} service
     */
    saveService: async function (service) {
      const res = await coreApi.createNamespacedService(
        this.owner.metadata.namespace,
        service
      );
    },

    /**
     *
     * @param {*} deployment
     */
    saveDeployment: async function (deployment) {
      return await appsApi.createNamespacedDeployment(
        this.owner.metadata.namespace,
        deployment
      );
    },

    saveServices: async () => {},
    saveIngress: async () => {},

    event: async function (options) {
      const event = {
        metadata: {
          generateName: "game-event-",
        },
        involvedObject: {
          kind: this.owner.kind,
          name: this.owner.metadata.name,
          uid: this.owner.metadata.uid,
          namespace: this.owner.metadata.namespace,
        },
        reason: options.reason,
        type: options.type || "Normal",
        lastTimestamp: new Date(),
        message: options.message,
      };
      await coreApi.createNamespacedEvent(this.owner.metadata.namespace, event);
    },

    /**
     *
     * @param {*} type
     * @param {*} object
     */
    save: async function (type, object) {
      const funcName = `save${type}`;
      if (!this.owner) {
        throw `Owner cannot be empty`;
      }
      if (!object) {
        throw `Object cannot be empty`;
      }
      if (typeof this[funcName] !== "function") {
        throw `${funcName} is not a valid function, aborting.`;
      }
      const addLabels = util.addDefaultLabels(object, this.owner);
      const final = util.addOwnerReference(addLabels, this.owner);
      return await this[funcName](final);
    },
  };

  return apiMachinery;
};
