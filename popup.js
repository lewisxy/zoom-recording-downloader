'use strict';

function log(...objects) {
  // Uncomment this line for debugging
  console.log(...objects);
}

// this page (script) get reloaded every time when popup is opened
let data = undefined;

getCurrentDataAndUpdateUI();
log("page loaded");

function getCurrentDataAndUpdateUI() {
  browser.storage.local.get("data", function(d) {
    data = d.data;
    log("data", d)
    updateUI();
  });
}

// called when download items are available or updated
function updateUI() {
  // Clear frame
  let mainFrame = document.getElementById('download');
  mainFrame.innerHTML = "";

  // Empty case
  if (Object.keys(data).length === 0) {
    let placeHolderMsg = document.createElement("p");
    placeHolderMsg.id = "placeholder";
    placeHolderMsg.textContent = "Nothing to download. Please open a Zoom recording to detect the download link.";
    placeHolderMsg.classList.add("invalid")

    mainFrame.appendChild(placeHolderMsg);
    return;
  }

  // Non-empty case
  let downloadList = document.createElement("ul");
  for (let k of Object.keys(data)) {
    const downloadUrl = data[k].url;

    let info = document.createElement("span");
    info.classList.add("item");
    info.textContent = new URL(downloadUrl).pathname.split("/").pop();

    let downloadIcon = document.createElement("span");
    downloadIcon.classList.add("download");
    downloadIcon.onclick = function() {
      download_func2(downloadUrl);
    }

    let button = document.createElement("a");
    button.appendChild(info);
    button.appendChild(downloadIcon);

    let item = document.createElement("li");
    item.appendChild(button);

    downloadList.appendChild(item);
  }
  mainFrame.appendChild(downloadList);
}

function download_func2(url) {
  log("initiate download", url);
  const options = {
    //filename: 'out.mp4',
    url: url,
    saveAs: true,
    // TODO: do more experiments regarding this option
    //incognito: true, // this is needed to download in private browsing mode
    //headers: [],
    method: "GET"
  }
  browser.downloads.download(options, function(downloadId) {
    log(`download started with id ${downloadId}`)
  });
}

// listen to background update
browser.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    log(request);
    if (request.reload) {
      window.location.reload();
    }
  }
);
