document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("notificationToggle");
    const panel = document.getElementById("notificationPanel");
    if (!toggle || !panel) return;

    const list = document.getElementById("notificationItems");
    const badge = document.getElementById("notificationCount");
    const more = document.getElementById("notificationLoadMore");
    const token = panel.querySelector("[name=csrfmiddlewaretoken]").value;
    let offset = 0;
    let loading = false;

    function setCount(count) {
        badge.textContent = count > 99 ? "99+" : String(count);
        badge.style.display = count ? "inline-block" : "none";
    }

    async function load(reset = false) {
        if (loading) return;
        loading = true;
        if (reset) {
            offset = 0;
            list.replaceChildren();
        }
        try {
            const response = await fetch(`${panel.dataset.listUrl}?offset=${offset}`, { headers: { "X-Requested-With": "XMLHttpRequest" } });
            if (!response.ok) return;
            const data = await response.json();
            setCount(data.unread_count);
            data.items.forEach((item) => {
                const row = document.createElement(item.url ? "a" : "div");
                row.className = `notification-row${item.read ? "" : " unread"}`;
                if (item.url) row.href = item.url;
                row.textContent = item.message;
                row.title = new Date(item.created_at).toLocaleString();
                if (!item.read) row.dataset.notificationId = item.id;
                if (item.url) row.addEventListener("click", async (event) => {
                    event.preventDefault();
                    await fetch(item.read_url, { method: "POST", headers: { "X-CSRFToken": token } });
                    window.location.assign(item.url);
                });
                list.append(row);
            });
            offset += data.items.length;
            more.hidden = !data.has_more;
            if (!offset) list.textContent = "You’re all caught up.";
        } finally {
            loading = false;
        }
    }

    toggle.addEventListener("click", () => {
        panel.hidden = !panel.hidden;
        toggle.setAttribute("aria-expanded", String(!panel.hidden));
        if (!panel.hidden) load(true);
    });
    more.addEventListener("click", () => load());
    document.getElementById("notificationMarkAll").addEventListener("click", async () => {
        const response = await fetch(panel.dataset.markAllUrl, { method: "POST", headers: { "X-CSRFToken": token } });
        if (response.ok) load(true);
    });

    load(true);
    window.setInterval(() => load(true), 30000);
});
