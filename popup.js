'use strict';

function log(...objects) {
  // Uncomment this line for debugging
  // console.log(...objects);
}

// this page (script) get reloaded every time when popup is opened
let data = undefined;

let transcriptData = undefined;

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
  browser.storage.local.get("transcriptData", function(d) {
    transcriptData = d.transcriptData;
    log("transcriptData", d)
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
    const transcriptUrl = transcriptData ? (transcriptData[k] ? transcriptData[k].url : undefined) : undefined;
    const videofilename = new URL(downloadUrl).pathname.split("/").pop();

    let info = document.createElement("span");
    info.classList.add("info");
    info.textContent = videofilename;

    // let downloadIcon = document.createElement("span");
    // downloadIcon.classList.add("download");

    let videoDownloadBtn = document.createElement("span");
    videoDownloadBtn.classList.add("btn");
    // videoDownloadBtn.appendChild(downloadIcon);
    videoDownloadBtn.onclick = function() {
      download_func2(downloadUrl);
    }
    videoDownloadBtn.textContent = "Download Video";

    let transcriptDownloadBtn = document.createElement("span");
    transcriptDownloadBtn.classList.add("btn");
    if (transcriptUrl) {
      transcriptDownloadBtn.onclick = function() {
        download_func2(transcriptUrl, `${videofilename.split(".")[0]}.vtt`);
      }
      transcriptDownloadBtn.textContent = "Download Transcript";
    } else {
      transcriptDownloadBtn.classList.add("disabled");
      transcriptDownloadBtn.onclick = function() {};
      transcriptDownloadBtn.textContent = "Transcript Not Available";
    }

    let item = document.createElement("li");
    let container = document.createElement("div");
    container.classList.add("container");
    container.appendChild(info);
    container.appendChild(videoDownloadBtn);
    container.appendChild(transcriptDownloadBtn);
    item.appendChild(container);
    downloadList.appendChild(item);
  }
  mainFrame.appendChild(downloadList);
}

function download_func2(url, filename=null) {
  log("initiate download", url);
  let options = {
    //filename: 'out.mp4', // this control the output filename in the dialog
    url: url,
    saveAs: true,
    //incognito: true, // this is needed to download in private browsing mode

    // tag the download so that our webrequest filter will replay with the saved headers
    headers: [{name: "internal-download", value: "1"}],
    method: "GET"
  }
  if (filename) {
    options["filename"] = filename;
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
