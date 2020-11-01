'use strict';

// persistent storage for the session
// map from browser url to download info
let data = {};

// map from download url to download info
// not stored in session storage
let record = {};

// initialization (clear the data from previous sessions)
browser.storage.local.set({"data": data});

// to make things simple, only background webrequest will commit changes
// into "data" and all other scripts just read from it.
// the data is cleared during initialization, and always in sync with "data"
// variable in memory
function saveActiveRequest(req, func) {
  // only save headers and urls to save space
  const savedObject = {
    url: req.url,
    originUrl: req.originUrl,
    requestHeaders: req.requestHeaders
  };
  if (data[savedObject.originUrl]) {
    // evict the record as download url changed
    const oldDownloadUrl = data[savedObject.originUrl].url;
    delete record[oldDownloadUrl];
    // check if delete failed, shouldn't happen
    if (Object.keys(record).length !== Object.keys(data).length - 1) {
      console.log("internal invarient check failed, something is wrong");
    }
  }
  record[savedObject.url] = savedObject;
  data[savedObject.originUrl] = savedObject;
  // check invarient again, data and record should have the same size
  if (Object.keys(record).length !== Object.keys(data).length) {
    console.log("internal invarient check failed 2, something is wrong");
  }
  browser.storage.local.set({"data": data}, func);
}

function updateUI() {
  // we don't care when the is update completed
  browser.browserAction.setBadgeText({text: Object.keys(data).length.toString()}, undefined);
  browser.runtime.sendMessage({"reload": "1"});
}

browser.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    console.log(details);
    if (details.type === "media") {
      // real request (sent from browser)
      saveActiveRequest(details, function() {console.log("data updated")}); // don't care when will it finished.
      updateUI();
    } else {
      // possibly the download request
      const internalHeader = /x-internal-(.*)/;
      let additionalHeaderNames = [];
      for (let i = 0; i < details.requestHeaders.length; ++i) {
        let x = details.requestHeaders[i];
        let res = internalHeader.exec(x.name);
        if (res) {
          let cmd = res[1];
          console.log(`internal header '${cmd}' found`);
          if (cmd === "header") { // add specific headers
            console.log(x.value, x.value.split(/[\t ]*,[\t ]*/));
            additionalHeaderNames = additionalHeaderNames.concat(x.value.split(/[\t ]*,[\t ]*/));
          }
          if (cmd === "replay") { // replay the request
            let savedReqest = record[details.url];
            if (!savedReqest) {
              console.log(`cannot found saved request for url ${details.url}`);
              return;
            }
            console.log("replay the previous request");
            return {requestHeaders: savedReqest.requestHeaders};
          }
          // remove all intrenal headers
          details.requestHeaders.splice(i, 1);
        }
      }
      console.log(additionalHeaderNames);

      let savedReqest = record[details.url];
      if (!savedReqest) {
        console.log(`cannot found saved request for url ${details.url}`);
        return;
      }

      // add new headers
      let newHeaders = {};
      for (let x of additionalHeaderNames) {
        const savedHeaders = ArrayToObject(savedReqest.requestHeaders);
        if (savedHeaders[x]) {
          newHeaders[x] = savedHeaders[x];
          console.log(`found ${x} in saved requests`);
        } else {
          console.log(`unable to find header ${x} from last saved request`);
        }
      }
      newHeaders = objectToArray(newHeaders);
      // assuming no duplicates
      console.log(newHeaders);
      details.requestHeaders = details.requestHeaders.concat(newHeaders);
      console.log("header after modification", details.requestHeaders);
      return {requestHeaders: details.requestHeaders};
    }
    // console.log(details);
  },
  {urls: ["https://ssrweb.zoom.us/*"]},
  ["requestHeaders"/*, "extraHeaders"*/, "blocking"]
);

// { <k>: <v> } --> [(name: k, value: v), ...]
function objectToArray(obj) {
  return Object.keys(obj).map((key) => ({name: key, value: obj[key]}));
}

// { <k>: <v> } <-- [(name: k, value: v), ...]
function ArrayToObject(arr) {
  let res = {};
  for (let x of arr) {
    res[x.name] = x.value;
  }
  return res;
}
