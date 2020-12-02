document.addEventListener('DOMContentLoaded', function () {
    browser.tabs.create({
        url: browser.runtime.getURL("/popup/options.html")
    })
    window.close()
})
