'use strict';

// this page (script) get reloaded every time when popup is opened
let data = undefined;

let placeHolderMsg = document.createElement("p");
placeHolderMsg.id = "placeholder";
placeHolderMsg.textContent = "Nothing to download. Please open a Zoom recording to detect the download link.";
placeHolderMsg.classList.add("invalid")

let parent = document.getElementById('download');
parent.appendChild(placeHolderMsg);

getCurrentDataAndUpdateUI();
console.log("page loaded");

function getCurrentDataAndUpdateUI() {
  browser.storage.local.get("data", function(d) {
    data = d.data;
    console.log("data", d)
    updateUI();
  });
}

// called when data is available or updated
function updateUI() {
  if (Object.keys(data).length === 0) {
    placeHolderMsg.hidden = false;
    return;
  } else {
    placeHolderMsg.hidden = true;
  }
  let ul = document.createElement("ul");
  for (let k of Object.keys(data)) {
    const downloadUrl = data[k].url;

    let info = document.createElement("h5");
    info.textContent = new URL(downloadUrl).pathname.split("/").pop();
    // info.onclick = function() {
    //   download_func2(downloadUrl);
    // }

    let downloadBtn = document.createElement("button");
    //downloadBtn.id = "";
    downloadBtn.onclick = function() {
      download_func2(downloadUrl);
    }

    // let subParent = document.createElement("div");
    // subParent.appendChild(info);
    // subParent.appendChild(downloadBtn);

    let container = document.createElement("li");
    container.appendChild(info);
    container.appendChild(downloadBtn);
    //container.appendChild(subParent);
    ul.appendChild(container);
  }
  parent.appendChild(ul);
}

function download_func2(url) {
  console.log("initiate download", url);
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
    console.log(`download started with id ${downloadId}`)
  });
}

// listen to background update
browser.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(request);
    if (request.reload) {
      window.location.reload();
    }
  }
);
