// db.js
const DB_NAME = "calibrationDB";
const STORE_NAME = "entries";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        store.createIndex("synced", "synced", { unique: false });
      }
    };

    request.onsuccess = function (event) {
      resolve(event.target.result);
    };

    request.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

export function saveEntry(entry) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).add(entry);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  });
}

export function getUnsyncedEntries() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = function () {
        const unsynced = request.result.filter((entry) => entry.synced === false);
        resolve(unsynced);
      };

      request.onerror = function (event) {
        reject(event.target.error);
      };
    });
  });
}

export function markAsSynced(id) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = function () {
        const data = getRequest.result;
        if (data) {
          data.synced = true;
          store.put(data);
        }
        resolve();
      };

      getRequest.onerror = function () {
        reject(getRequest.error);
      };
    });
  });
}
