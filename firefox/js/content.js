$(document).ready(function () {
    init()
})

let currentBody, url = null;


let subscriptions = [];
let notifications = [];

function init() {
    setInterval(function () {
        if (currentBody != document.body) {
            currentBody = document.body;
            initMain()
        }
    }, 1000);
}

browser.runtime.onMessage.addListener((request, sender) => {
    if (sender.tab || !request.q) return;

    if (request.q == "update") {
        Promise.all([reloadSubscriptions(), reloadNotifications()]).then(generateContainer)
    }
})

const reloadSubscriptions = async () => {
    subscriptions = await browser.runtime.sendMessage({q: "subscriptions"});
}
const reloadNotifications = async () => {
    notifications = await browser.runtime.sendMessage({q: "notifications"});
}

async function initMain() {
    await reloadSubscriptions();
    await reloadNotifications();
    url = window.location.href;
    initSubscriptions();
    if (url.match(/^https?:\/\/osu\.ppy\.sh\/users\//)) {
        initSubscribeButton();
    }

}

function initSubscriptions() {
    initSubscriptionsButton();
}

function initNotifications() {
    $(".removeNotification").click(event => {
        event.currentTarget.disabled = true;
        event.currentTarget.children[1].children[0].classList.add("la-ball-clip-rotate");
        browser.runtime.sendMessage({
            q: "manageNotification",
            action: "remove",
            index: event.currentTarget.attributes.getNamedItem("key").value
        }).then(res => {
            if (!res.status) {
                event.currentTarget.children[1].children[0].classList.remove("la-ball-clip-rotate");
            }
            event.currentTarget.disabled = false;
        })
    })
}

function initSubscriptionsListEvents() {
    $(".removeSubscription").click(event => {
        event.currentTarget.disabled = true;
        event.currentTarget.children[1].children[0].classList.add("la-ball-clip-rotate");
        let subscription = subscriptions[event.currentTarget.attributes.getNamedItem("key").value];
        browser.runtime.sendMessage({
            q: "manageSubscriber",
            action: "remove",
            userJSON: subscription
        }).then(res => {
            if (!res.status) {
                event.currentTarget.children[1].children[0].classList.remove("la-ball-clip-rotate");
            }
            event.currentTarget.disabled = false;
            if (url.match(/^https?:\/\/osu\.ppy\.sh\/users\//)) {
                let userJSON = JSON.parse($("#json-user")[0].innerHTML);
                if (subscription.id == userJSON.id) $("#subscribebutton")[0].classList.remove("user-action-button--friend");
            }
        })
    })
}

function initSubscriptionsButton() {
    let rightNav = $('.nav2__colgroup.js-nav-button--container')[1];
    let avatarbutton = $(".nav2__col--avatar")[0];

    let subscriptionButton = document.createElement("div");
    subscriptionButton.classList.add("nav2__col");
    subscriptionButton.innerHTML = `<!--suppress ALL -->
<button class="nav-button nav-button--stadium js-click-menu" id="subscriptionsbutton">
    <span id="notificationicon" class="notification-icon"><i class="fas fa-bell"></i><span id="notificationcount" class="notification-icon__count">0</span></span>
    </button>
    <div class="nav-click-popup js-click-menu">
        <div id="widgetSubscription" class="notification-popup u-fancy-scrollbar js-nav2--centered-popup hidden"
             style="transform: translateX(-20px);">
            <div id="subscriptionsContainer" class="notification-popup__scroll-container">
                <div class="notification-popup__buttons">
                    <span id="allnotificationCount" class="notification-popup__filter-count">0</span>
                    <button id="switchNotifications" type="button" class="notification-action-button"><span
                            class="notification-action-button__text">Notifications</span></button>
                    <div class="notification-popup__clear-button"><span id="subscriptionCount"
                                                                        class="notification-popup__filter-count">0</span>
                        <button id="switchSubscriptions" type="button" class="notification-action-button"><span
                                class="notification-action-button__text">Subscriptions</span></button>
                    </div>
                </div>
                <div id="notificationActionButtons" class="notification-popup__buttons">                        
                    <button style="color: hsl(var(--hsl-c2))" id="readAllNotifications" type="button" class="notification-action-button"><span
                                    class="notification-action-button__text">mark all as read</span>
                    </button>
                    <div class="notification-popup__clear-button">
                        <button  style="color: hsl(var(--hsl-c2))" id="deleteAllNotifications" type="button" class="notification-action-button"><span
                                class="notification-action-button__text">delete all</span>
                            <div class="notification-action-button__icon"><span class="fas fa-times"></span></div>
                        </button>
                    </div>
                </div>
            <div id="notifications">notification</div>
            <div id="subscriptions" class="hidden">subs</div>
        </div>
    </div>`

    rightNav.insertBefore(subscriptionButton, avatarbutton);
    $("#subscriptionsbutton").click(function () {
        if (!$("#widgetSubscription")[0].classList.contains("hidden")) {
            browser.runtime.sendMessage({q: "manageNotification", action: "readAll"})
        }
        $("#widgetSubscription")[0].classList.toggle("hidden");
    });
    $("#switchNotifications").click(function () {
        $("#subscriptions")[0].classList.add("hidden");
        $("#notifications")[0].classList.remove("hidden");
        $("#notificationActionButtons")[0].classList.remove("hidden");
    });
    $("#switchSubscriptions").click(function () {
        $("#notifications")[0].classList.add("hidden");
        $("#notificationActionButtons")[0].classList.add("hidden");
        $("#subscriptions")[0].classList.remove("hidden");
    });
    $("#readAllNotifications").click(function () {
        browser.runtime.sendMessage({q: "manageNotification", action: "readAll"});
    });
    $("#deleteAllNotifications").click(function () {
        browser.runtime.sendMessage({q: "manageNotification", action: "deleteAll"})
    });
    generateContainer();
}

function initSubscribeButton() {
    let controlNav = $(".profile-detail-bar__column.profile-detail-bar__column--left")[0];
    let followbutton = $(".profile-detail-bar__entry")[0];

    if ($("button[disabled]").length === 0) {

        let subscribeButton = document.createElement("div");
        subscribeButton.classList.add("profile-detail-bar__entry");
        subscribeButton.innerHTML = `<button id="subscribebutton" type="button" class="user-action-button user-action-button--profile-page"><span class="user-action-button__icon-container"><span class="user-action-button__icon" ><i class="fas fa-bell" id="subscribeicon"></i></span></button>`

        controlNav.insertBefore(subscribeButton, followbutton.nextSibling);
        let userJSON = JSON.parse($("#json-user")[0].innerHTML);

        if (subscriptions.find(s => s.id === userJSON.id)) $("#subscribebutton")[0].classList.add("user-action-button--friend");

        $("#subscribebutton").click(async function () {
            $("#subscribeicon")[0].classList.add("la-ball-clip-rotate");
            $("#subscribebutton")[0].disabled = true;
            await reloadSubscriptions();
            if (!subscriptions.find(s => s.id === userJSON.id)) {
                browser.runtime.sendMessage({q: "manageSubscriber", action: "add", userJSON}).then(response => {
                    if (response.status) {
                        $("#subscribebutton")[0].classList.add("user-action-button--friend");
                        $("#subscribeicon")[0].classList.remove("la-ball-clip-rotate");
                        $("#subscribebutton")[0].disabled = false;
                    } else {
                        alert("An error occured during adding subscriptions.")
                    }
                })
            } else {
                browser.runtime.sendMessage({q: "manageSubscriber", action: "remove", userJSON}).then(response => {
                    if (response.status) {
                        $("#subscribebutton")[0].classList.remove("user-action-button--friend");
                        $("#subscribeicon")[0].classList.remove("la-ball-clip-rotate");
                        $("#subscribebutton")[0].disabled = false;
                    } else {
                        alert("An error occured during adding subscriptions.")
                    }
                })
            }
        });
    }
}

function generateContainer() {
    genereateSubscriptionsContainer();
    genereateNotificationsContainer();
}

function genereateSubscriptionsContainer() {
    let html = "There is no subscriptions yet."
    if (subscriptions.length > 0) {
        html = `<div class="notification-stacks">`;
        subscriptions.forEach((sub, index) => {
            html += `<div class="clickable-row notification-popup-item notification-popup-item--one notification-popup-item--channel"><div class="notification-popup-item__cover" style="background-image: url(&quot;https://a.ppy.sh/${sub.id}?1601747533.jpeg&quot;);"></div><div class="notification-popup-item__main"><div class="notification-popup-item__content"><a href="https://osu.ppy.sh/users/${sub.id}" class="notification-popup-item__row notification-popup-item__row--message clickable-row-link">${sub.username}</a></div><button key="${index}" type="button" class="notification-action-button notification-action-button--fancy removeSubscription"><span class="notification-action-button__text"></span><div class="notification-action-button__icon"><span class="fas fa-times"></span></div></button></div></div>`
        });
        html += `</div>`;
    }
    $("#subscriptionCount")[0].innerText = subscriptions.length;
    $("#subscriptions")[0].innerHTML = html;
    initSubscriptionsListEvents();
}

function genereateNotificationsContainer() {
    if (notifications.filter(n => !n.read).length > 0) {
        $('#notificationicon')[0].classList.add("notification-icon--glow")
    } else {
        $('#notificationicon')[0].classList.remove("notification-icon--glow")
    }
    $('#notificationcount')[0].innerText = notifications.filter(n => !n.read).length;
    let html = "There is no notifications yet."
    if (notifications.length > 0) {
        html = `<div class="notification-stacks">`;
        [...notifications].sort(((a, b) => {
            return new Date(b.date) - new Date(a.date);
        })).forEach(ntf => {
            let i = notifications.findIndex(n => n == ntf)
            let readStyle = "";
            if (ntf.read) readStyle = 'style="filter: brightness(0.6)"'
            html += `<div ${readStyle} class="clickable-row notification-popup-item notification-popup-item--one notification-popup-item--channel"><div class="notification-popup-item__cover" style="background-image: url(https://b.ppy.sh/thumb/${ntf.id}l.jpg);"><div class="notification-popup-item__cover-overlay"></div></div><div class="notification-popup-item__main"><div class="notification-popup-item__content"><div class="notification-popup-item__row notification-popup-item__row--category">${ntf.title}</div><a href="https://osu.ppy.sh/beatmapsets/${ntf.id}" class="notification-popup-item__row notification-popup-item__row--message clickable-row-link">${ntf.content}</a><div class="notification-popup-item__row notification-popup-item__row--time">${ntf.creator}</div><div class="notification-popup-item__row notification-popup-item__row--time"><time class="js-timeago" datetime="${ntf.date}" title="${ntf.date}"></time></div></div><button key="${i}" type="button" class="notification-action-button notification-action-button--fancy removeNotification"><span class="notification-action-button__text"></span><div class="notification-action-button__icon"><span class="fas fa-times"></span></div></button></div></div>`
        });
        html += `</div>`;
    }
    $("#allnotificationCount")[0].innerText = notifications.length;
    $("#notifications")[0].innerHTML = html;
    initNotifications();
}
