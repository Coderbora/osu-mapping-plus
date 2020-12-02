document.addEventListener('DOMContentLoaded', function () {
    chrome.tabs.create({
        url: chrome.runtime.getURL("/popup/options.html")
    })
    window.close()
})
