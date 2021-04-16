'use strict';

function log(...objects) {
  // Uncomment this line for debugging
  console.log(...objects);
}

// this page (script) get reloaded every time when popup is opened
let data = undefined;

getCurrentDataAndUpdateUI();
log("page loaded");

document.getElementById("clear").onclick = function(ev) {
  browser.storage.local.set({"data": {}}, getCurrentDataAndUpdateUI);
}

document.getElementById("badgeOption").onclick = function(ev) {
  browser.storage.local.get({"showBadge": true}, function(data) {
    browser.storage.local.set({"showBadge": !data.showBadge}, getCurrentDataAndUpdateUI)
  })
}

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

  // Set badge
  browser.storage.local.get({"showBadge": true}, function(d) {
    log("showBadge", d.showBadge);
    document.getElementById("badgeOption").innerText =
      d.showBadge? "Hide Badge": "Show Badge";

    let text = null;
    if (d.showBadge && Object.keys(data).length > 0)
      text = Object.keys(data).length.toString();
    log("text", text);
    browser.browserAction.setBadgeText({text: text});
  })

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

    let button = document.createElement("a");
    button.appendChild(info);
    button.appendChild(downloadIcon);
    button.onclick = function() {
      download_func2(downloadUrl);
    }

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
