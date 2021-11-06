import { Storage } from "@google-cloud/storage";
import axios from "axios";
import { URL } from "url";
import { promisify } from "util";
import { exec } from "child_process";
import * as path from "path";
import { sep } from "path";
import * as fs from "fs";
import * as os from "os";

export function addOwnerReference(api, owner) {
  const newApi = { ...api };
  newApi["metadata"]["ownerReferences"] = [
    {
      apiVersion: "retro.sparkfabrik.com/v1",
      controller: true,
      blockOwnerDeletion: true,
      kind: "Game",
      name: owner.metadata.name,
      uid: owner.metadata.uid,
    },
  ];
  return newApi;
}

export function addDefaultLabels(api, owner) {
  if (!api.metadata && owner.metadata) {
    throw `Objects must contain a metadata property`;
  }
  const newApi = { ...api };
  const defaultLabels = {
    "sparkfabrik.com/game": owner.metadata.name,
  };
  newApi.metadata.labels = { ...newApi.metadata.labels, ...defaultLabels };
  return newApi;
}

const mkTempDir = async () => {
  return await promisify(fs.mkdtemp)(`${os.tmpdir()}${sep}`);
};

/**
 *
 * @param {*} gameObject
 */
export const download = async (gameObject) => {
  const url = new URL(gameObject.spec.zipUrl);
  const protocol = url.protocol;
  if (protocol == "gs:") {
    return await downloadFromGcs(url);
  }
  if (protocol === "http:" || protocol === "https:") {
    return await downloadFromHttp(url);
  }
  throw new Error(`Not supported protocol: ${protocol}`);
};

/**
 *
 * @param {*} gameObject
 */
const downloadFromHttp = async (url) => {
  const filename = url.pathname.substr(1, url.pathname.length).split('/').pop();
  const dest = (await mkTempDir()) + `/${filename}`;
  const response = await axios({
    method: "get",
    url: url.href,
    responseType: "stream",
  });
  response.data.pipe(fs.createWriteStream(dest, response.data));
  return new Promise((resolve, reject) => {
    response.data.on("end", () => {
      resolve(dest);
    });

    response.data.on("error", (err) => {
      reject(err);
    });
  });
};

const downloadFromGcs = async (url) => {
  const storage = new Storage();
  const filename = url.pathname.substr(1, url.pathname.length);
  const dest = (await mkTempDir()) + `/${filename}`;
  await storage.bucket(url.host).file(filename).download({ destination: dest });
  return dest;
};

/**
 *
 * @param {*} game
 */
export const splitFile = async (game) => {
  if (!fs.statSync(game)) {
    throw `${path} does not exists, cannot split the requested file.`;
  }
  const dir = path.dirname(game);
  const file = path.basename(game);
  await promisify(exec)(`cd ${dir}; split -d -b 1M ${file} ${file}-split`);
  const { stdout } = await promisify(exec)(
    `find ${dir} -name "${file}-split*" | sort`
  );
  const split = stdout.split(/[\r\n|\n|\r]/).filter(String);
  return split;
};
