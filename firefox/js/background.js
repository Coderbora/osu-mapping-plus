let store = {}

let updateTimer = null;

browser.storage.local.get().then(s => {
    store = s;

    if (!store.hasOwnProperty("subscriptions"))
        store.subscriptions = []

    if (!store.hasOwnProperty("notifications"))
        store.notifications = []

    writeStore().then(scheduleUpdate);
});

function writeStore() {
    return new Promise(resolve => {
        browser.storage.local.set(store).then(() => {
            browser.tabs.query({url: "*://osu.ppy.sh/*"}).then(tabs => {
                tabs.forEach(tab => {
                    browser.tabs.sendMessage(tab.id, {q: "update"});
                })

                resolve();
            });
        })
    })
}

setInterval(() => {
    if (!store.subscriptions.find(s => s.in_use)) {
        clearInterval(updateTimer);
        scheduleUpdate()
    }
}, 1000 * 60 * 60);

function scheduleUpdate() {
    let updateList = store.subscriptions.filter(s => (Date.now() - s.updated) > 3600000 && !s.in_use);
    if (updateList.length > 0) {
        updateTimer = setTimeout(() => {
            let _sub = store.subscriptions.find(s => s.id == updateList[0].id);
            _sub.in_use = true;
            let promises = [
                new Promise((resolve) => GetPage(`https://osu.ppy.sh/users/${_sub.id}/beatmapsets/ranked_and_approved?limit=51`, (res) => resolve(res))),
                new Promise((resolve) => GetPage(`https://osu.ppy.sh/users/${_sub.id}/beatmapsets/graveyard?limit=51`, (res) => resolve(res))),
                new Promise((resolve) => GetPage(`https://osu.ppy.sh/users/${_sub.id}/beatmapsets/unranked?limit=51`, (res) => resolve(res)))
            ];
            Promise.all(promises).then(res => {
                let nmaps = [JSON.parse(res[0]), JSON.parse(res[1]), JSON.parse(res[2])].flat()

                nmaps.forEach(_m => {
                    let oldVer = _sub.maps.find(m => m.id == _m.id);
                    if(oldVer) {
                        if (oldVer.status !== _m.status) {
                            store.notifications.push({
                                id: _m.id,
                                title: "Status Update",
                                content: `${_m.artist} - ${_m.title} is now ${_m.status} instead of ${oldVer.status}!`,
                                creator: _m.creator,
                                date: _m.last_updated,
                                read: false
                            })
                        }
                        else if (oldVer.last_updated !== _m.last_updated) {
                            store.notifications.push({
                                id: _m.id,
                                title: "New Update",
                                content: `${_m.artist} - ${_m.title} has new update!`,
                                creator: _m.creator,
                                date: _m.last_updated,
                                read: false
                            })
                        }
                    } else {
                        store.notifications.push({
                            id: _m.id,
                            title: "New Submission",
                            content: `${_m.artist} - ${_m.title} is now submitted!`,
                            creator: _m.creator,
                            date: _m.submitted_date,
                            read: false
                        })
                    }
                })

                _sub.maps.forEach(_m => {
                    if(!nmaps.find(m => m.id == _m.id)) {
                        store.notifications.push({
                            id: _m.id,
                            title: "Map Deletion",
                            content: `${_m.artist} - ${_m.title} is deleted!`,
                            creator: _sub.username,
                            date: new Date().toISOString(),
                            read: false
                        })
                    }
                })
                //save updated values and then
                _sub.updated = Date.now();
                _sub.maps = formatMaps(nmaps);
                _sub.in_use = false;
                writeStore().then(scheduleUpdate);
            })
        }, 20000);
    }
}

function GetPage(url, cb) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            cb(xhr.responseText);
        }
    }
    xhr.send();
}

function formatMaps (maps) { return maps.map(({artist, id, status, title, last_updated}) => ({artist, id, status, title, last_updated})); }

browser.runtime.onMessage.addListener(handleMessage)

function handleMessage(r, sender, sendResponse) {
    if (!sender.tab || !r.q || Object.keys(store).length === 0) return;

    switch (r.q) {
        case "subscriptions":
            sendResponse(store["subscriptions"]);
            break;
        case "notifications":
            sendResponse(store["notifications"]);
            break;
        case "manageSubscriber":
            if (!r.action || !r.userJSON) break;
            if (r.action === "add") {
                let promises = [
                    new Promise((resolve) => GetPage(`https://osu.ppy.sh/users/${r.userJSON.id}/beatmapsets/ranked_and_approved?limit=51`, (res) => resolve(res))),
                    new Promise((resolve) => GetPage(`https://osu.ppy.sh/users/${r.userJSON.id}/beatmapsets/graveyard?limit=51`, (res) => resolve(res))),
                    new Promise((resolve) => GetPage(`https://osu.ppy.sh/users/${r.userJSON.id}/beatmapsets/unranked?limit=51`, (res) => resolve(res)))
                ];
                Promise.all(promises).then(res => {
                    let maps = [JSON.parse(res[0]), JSON.parse(res[1]), JSON.parse(res[2])].flat()
                    store.subscriptions.push({
                        id: r.userJSON.id,
                        username: r.userJSON.username,
                        maps: formatMaps(maps),
                        updated: Date.now(),
                        in_use: false
                    })
                    writeStore().then(() => {
                        sendResponse({status: true})
                    });
                }).catch(() => sendResponse({status: false}))
            } else if (r.action === "remove") {
                let deleteIndex = store.subscriptions.findIndex(s => s.id === r.userJSON.id)
                store.subscriptions.splice(deleteIndex, 1);
                writeStore().then(() => {
                    sendResponse({status: true})
                });
            } else {
                break;
            }
            break;
        case "manageNotification":
            if (!r.action) break;
            if (r.action === "readAll") {
                store.notifications.forEach(n => {
                    n.read = true;
                })
                writeStore().then(() => {
                    sendResponse({status: true})
                })
            } else if (r.action === "remove") {
                if(!r.index) break;
                store.notifications.splice(r.index, 1);
                writeStore().then(() => {
                    sendResponse({status: true})
                })
            } else {
                break;
            }
            break;
    }

    return true;
}
