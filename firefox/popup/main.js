function download(filename, text) {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

$('#backup').click(async function (event) {
    event.preventDefault();
    download(`backup_osump_${Date.now()}`, JSON.stringify({
        notifications: await browser.runtime.sendMessage({ q: "notifications" }),
        subscriptions: await browser.runtime.sendMessage({ q: "subscriptions" })
    }))
})


$('#restore').on('click', async function() {
    $('#restoreInput').trigger('click');
});

$('#restoreInput').change(event => {
    let file = event.currentTarget.files[0];
    if (file) {
        let reader = new FileReader();
        reader.readAsText(file, "UTF-8");
        reader.onload = function (evt) {
            try {
                let jsonTest = JSON.parse(evt.target.result);
                if(jsonTest.hasOwnProperty("notifications") && jsonTest.hasOwnProperty("subscriptions")) {
                    browser.runtime.sendMessage({ q: "updateStore", store: evt.target.result})
                    alert("Restoration successful.");
                }
                else alert("Corrupted backup file.");
            } catch {
                alert("Corrupted backup file.")
            }
        }
    }
})
