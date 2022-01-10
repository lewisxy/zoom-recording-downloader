'use strict';

function log(...objects) {
  // Uncomment this line for debugging
  // console.log(...objects);
}

const INTERNAL_HEADER = "internal-download";

// persistent storage for the session
// map from browser url to download info
let data = {};

// map from download url to download info
// not stored in session storage
let record = {};

// initialization (clear the data from previous sessions)
browser.storage.local.set({"data": data});

// similar things for transcript
let transcriptData = {};
let transcriptRecord = {};
browser.storage.local.set({"transcriptData": transcriptData});

// to make things simple, only background webrequest will commit changes
// into "data" and all other scripts just read from it.
// the data is cleared during initialization, and always in sync with "data"
// variable in memory
function saveActiveRequest(data, record, dataName, req, func) {
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
      log("internal invarient check failed, something is wrong");
    }
  }
  record[savedObject.url] = savedObject;
  data[savedObject.originUrl] = savedObject;
  // check invarient again, data and record should have the same size
  if (Object.keys(record).length !== Object.keys(data).length) {
    log("internal invarient check failed 2, something is wrong");
  }
  let tmp = {};
  tmp[dataName] = data;
  browser.storage.local.set(tmp, func);
}

function saveVideoDownloadRequest(req, func) {
  saveActiveRequest(data, record, "data", req, func);
}

function saveTranscriptDownloadRequest(req, func) {
  saveActiveRequest(transcriptData, transcriptRecord, "transcriptData", req, func);
}

function updateUI() {
  // Set badge
  browser.storage.local.get({"showBadge": true}, function(d) {
    log("showBadge", d.showBadge);
    let text = null;
    if (d.showBadge && Object.keys(data).length > 0)
      text = Object.keys(data).length.toString();
    log("text", text);
    browser.browserAction.setBadgeText({text: text});
  })
  // Reload popup when it's open
  browser.runtime.sendMessage({"reload": "1"});
}

browser.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    log(details);
    if (details.type === "media") {
      // real request (sent from browser)
      saveVideoDownloadRequest(details, function() {log("data updated")}); // don't care when will it finished.
      updateUI();
    } else {
      // possibly the download request
      const tmp = ArrayToObject(details.requestHeaders);
      if (INTERNAL_HEADER in tmp) {
        log("found internal download flag");
        let savedReqest = record[details.url];
        if (!savedReqest) {
          log(`cannot found saved request for url ${details.url}`);
          return;
        }
        log("replay the previous request");
        // overwrite range keyword
        modifyHeader({range: "bytes=0-"}, savedReqest.requestHeaders);
        return {requestHeaders: savedReqest.requestHeaders};
      } else {
        // we are not interested in other requests
        log(`ignoring request ${details.requestId}`);
      }
    }
    // log(details);
  },
  {urls: ["https://ssrweb.zoom.us/*"]},
  ["requestHeaders"/*, "extraHeaders"*/, "blocking"]
);

// also log transcript url
browser.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    const url = new URL(details.url);
    const params = new URLSearchParams(url.search);
    if (params.get("type") === "transcript") {
      const tmp = ArrayToObject(details.requestHeaders);
      if (INTERNAL_HEADER in tmp) {
        log("found internal download flag");
        // download request, replay the record if possible
        let savedReqest = transcriptRecord[details.url];
        if (!savedReqest) {
          log(`cannot found saved request for url ${details.url}`);
          return;
        }
        log("replay the previous request");
        return {requestHeaders: savedReqest.requestHeaders};
      } else {
        // normal request, record its data
        log(`found transcript url ${details.url} for page ${details.originUrl}`);
        saveTranscriptDownloadRequest(details, function() {log("transcript data updated")});
        // updateUI();
      }
    } else {
      // we are not interested in other requests
      log(`ignoring request ${details.requestId}`);
    }
  },
  {urls: ["https://*.zoom.us/rec/play/vtt", "https://*.zoom.us/rec/play/vtt?*"]},
  ["requestHeaders"/*, "extraHeaders"*/, "blocking"]
);

// modify a headers using mod
// mod is an object those key-value represents header name and content
// only 1 header in headers (if there are duplicates) will be modified
// (modifying more than 1 header with the same name is not currently supported)
// if header in mod is not present in headers, it will be injected
// mod will be modified !!!
function modifyHeader(mod, headers) {
  log("before modification ", headers);
  for (let i = 0; i < headers.length; ++i) {
    // use case insensitive match
    if (headers[i].name.toLowerCase() in mod) {
      //log(`${headers[i].name} in mod`);
      headers[i].value = mod[headers[i].name.toLowerCase()];
      delete mod[headers[i].name];
    } else {
      log(`${headers[i].name} not in mod`);
    }
    //headers.splice(i, 1);
  }
  for (let x of Object.keys(mod)) {
    headers.push({name: x, value: mod[x]});
  }
  //log("after modification ", headers);
}

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
