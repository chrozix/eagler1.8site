
function arrayBufferToBase64(buffer) {
  let binary = "";
  let bytes = new Uint8Array(buffer);
  let len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  var binaryString = window.atob(base64);
  var len = binaryString.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function isAnObject(value) {
  return typeof value === "object" && !Array.isArray(value) && value != null;
}

function encodeArrayBuffers(object) {
  for (const [key, value] of Object.entries(object)) {
    if (value instanceof ArrayBuffer) object[key] = { type: "arraybuffer", value: arrayBufferToBase64(value) };
    else if (isAnObject(value)) object[key] = encodeArrayBuffers(value);
  }
}

function decodeArrayBuffers(object) {
  for (const [key, value] of Object.entries(object)) {
    if (isAnObject(value)) {
      if (value.type === "arraybuffer" && typeof value.value == "string") {
        object[key] = base64ToArrayBuffer(value.value);
      } else {
        object[key] = decodeArrayBuffers(value);
      }
    } else if (Array.isArray(value)) {
      value.forEach((v) => {
        if (isAnObject(v)) {
          for (const [key, value] of Object.entries(v)) {
            if (value.type === "arraybuffer" && typeof value.value == "string") {
              v[key] = base64ToArrayBuffer(value.value);
            }
          }
        }
      });
    }
  }
}

function exportToJsonString(idbDatabase, cb) {
  const exportObject = {};
  const objectStoreNamesSet = new Set(idbDatabase.objectStoreNames);
  const size = objectStoreNamesSet.size;
  if (size === 0) {
    cb(null, JSON.stringify(exportObject));
  } else {
    const objectStoreNames = Array.from(objectStoreNamesSet);
    const transaction = idbDatabase.transaction(objectStoreNames, "readonly");
    transaction.onerror = (event) => cb(event, null);

    objectStoreNames.forEach((storeName) => {
      const allObjects = [];
      transaction.objectStore(storeName).openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          let value = cursor.value;
          encodeArrayBuffers(value);
          allObjects.push(value);
          cursor.continue();
        } else {
          exportObject[storeName] = allObjects;
          if (objectStoreNames.length === Object.keys(exportObject).length) {
            cb(null, JSON.stringify(exportObject));
          }
        }
      };
    });
  }
}

function isDBEmpty(idbDatabase) {
  const objectStoreNames = Array.from(idbDatabase.objectStoreNames);
  return objectStoreNames.length == 0;
}

function clearIndexedDB(idbDatabase) {
  const objectStoreNames = Array.from(idbDatabase.objectStoreNames);
  if (objectStoreNames.length === 0) {
    console.log("No object stores exist in the IndexedDB.");
    return;
  }

  const transaction = idbDatabase.transaction(objectStoreNames, "readwrite");
  transaction.onerror = (event) => console.log(`Error: ${event}`);

  for (const storeName of objectStoreNames) {
    const objectStore = transaction.objectStore(storeName);
    objectStore.clear();
    console.log(`Cleared data in object store: ${storeName}`);
  }
}

function importFromJsonString(idbDatabase, jsonString, cb) {
  let objectStoreNamesSet = new Set(idbDatabase.objectStoreNames);
  const objectStoreNames = Array.from(objectStoreNamesSet);
  let importObject = Object.assign(JSON.parse(jsonString), {});
  decodeArrayBuffers(importObject);

  let missingStores = [];
  for (const key of Object.keys(importObject)) {
    if (!objectStoreNamesSet.has(key)) {
      missingStores.push(key);
    }
  }
  if (missingStores.length > 0) {
    cb({ missingStores: true, stores: missingStores }, null);
    return;
  }
  objectStoreNamesSet = new Set(idbDatabase.objectStoreNames);

  const transaction = idbDatabase.transaction(objectStoreNames, "readwrite");
  transaction.onerror = (event) => cb(event);

  // Delete keys present in JSON that are not present in database
  Object.keys(importObject).forEach((storeName) => {
    if (!objectStoreNames.includes(storeName)) {
      delete importObject[storeName];
    }
  });

  if (Object.keys(importObject).length === 0) {
    // no object stores exist to import for
    cb(null);
  }

  objectStoreNames.forEach((storeName) => {
    let count = 0;

    const aux = Array.from(importObject[storeName] || []);

    if (importObject[storeName] && aux.length > 0) {
      aux.forEach((toAdd) => {
        const request = transaction.objectStore(storeName).add(toAdd);
        request.onsuccess = () => {
          count++;
          if (count === importObject[storeName].length) {
            // added all objects for this store
            delete importObject[storeName];
            if (Object.keys(importObject).length === 0) {
              // added all object stores
              cb(null);
            }
          }
        };
        request.onerror = (event) => {
          console.log(event);
        };
      });
    } else {
      if (importObject[storeName]) {
        delete importObject[storeName];
        if (Object.keys(importObject).length === 0) {
          // added all object stores
          cb(null);
        }
      }
    }
  });
}
