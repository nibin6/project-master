(() => {
    const root = document.querySelector('.floating-chat-root');
    if (!root) return;

    const launch = document.getElementById('chat-launch');
    const windowEl = document.getElementById('floating-chat-window');
    const badge = document.getElementById('chat-unread-badge');
    const conversationList = document.getElementById('chat-conversation-list');
    const title = document.getElementById('chat-conversation-title');
    const context = document.getElementById('chat-conversation-context');
    const messageList = document.getElementById('chat-message-list');
    const composer = document.getElementById('chat-composer');
    const messageInput = document.getElementById('chat-message-input');
    const status = document.getElementById('chat-status');
    const csrf = document.querySelector('#floating-chat-csrf [name="csrfmiddlewaretoken"]')?.value || '';
    const conversationsUrl = root.dataset.conversationsUrl;
    const messageUrlPattern = root.dataset.messageUrlPattern;
    let conversations = [];
    let selectedId = null;
    let activeMessageLoadId = null;
    const minimizeButton = document.getElementById('chat-minimize');

    const endpointFor = (id) => messageUrlPattern.replace('123456789', String(id));

    function setUnreadCount(count) {
        const unread = Number(count) || 0;
        badge.textContent = unread > 99 ? '99+' : String(unread);
        badge.classList.toggle('d-none', unread === 0);
        launch.setAttribute('aria-label', unread ? `Open messages, ${unread} unread` : 'Open messages');
    }

    function safeAvatarUrl(rawUrl) {
        if (!rawUrl) return '';
        try {
            const url = new URL(rawUrl, window.location.href);
            return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
        } catch (_) {
            return '';
        }
    }

    function makeAvatar(conversation) {
        const avatar = document.createElement('span');
        avatar.className = 'floating-chat-avatar';
        const imageUrl = safeAvatarUrl(conversation.avatar_url);
        if (imageUrl) {
            const image = document.createElement('img');
            image.src = imageUrl;
            image.alt = '';
            image.onerror = () => { avatar.textContent = conversation.other_user.slice(0, 1).toUpperCase(); };
            avatar.append(image);
        } else {
            avatar.textContent = conversation.other_user.slice(0, 1).toUpperCase();
        }
        return avatar;
    }

    function renderConversations() {
        const previousScroll = conversationList.scrollTop;
        conversationList.replaceChildren();
        if (!conversations.length) {
            const empty = document.createElement('p');
            empty.className = 'floating-chat-empty';
            empty.textContent = 'No accepted exchanges yet.';
            conversationList.append(empty);
            conversationList.scrollTop = previousScroll;
            return;
        }
        conversations.forEach((conversation) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'floating-chat-conversation-button';
            if (Number(conversation.id) === Number(selectedId)) button.classList.add('is-selected');
            button.setAttribute('aria-label', `${conversation.other_user}, ${conversation.context}${conversation.unread_count ? `, ${conversation.unread_count} unread` : ''}`);
            button.append(makeAvatar(conversation));

            const copy = document.createElement('span');
            copy.className = 'floating-chat-conversation-copy';
            const name = document.createElement('strong');
            name.textContent = conversation.other_user;
            const detail = document.createElement('span');
            detail.textContent = conversation.context;
            const preview = document.createElement('span');
            preview.textContent = conversation.last_message || conversation.status;
            if (conversation.unread_count) preview.classList.add('floating-chat-unread');
            copy.append(name, detail, preview);
            button.append(copy);

            if (conversation.unread_count) {
                const unread = document.createElement('span');
                unread.className = 'badge rounded-pill text-bg-primary';
                unread.textContent = String(conversation.unread_count);
                button.append(unread);
            }
            button.addEventListener('click', () => loadMessages(conversation.id));
            conversationList.append(button);
        });
        conversationList.scrollTop = previousScroll;
    }

    function renderMessages(messages) {
        messageList.replaceChildren();
        if (!messages.length) {
            const empty = document.createElement('p');
            empty.className = 'floating-chat-empty';
            empty.textContent = 'No messages yet. Say hello!';
            messageList.append(empty);
            return;
        }
        messages.forEach((message) => {
            const bubble = document.createElement('div');
            bubble.className = 'floating-chat-message';
            if (message.is_mine) bubble.classList.add('is-mine');
            const sender = document.createElement('span');
            sender.className = 'floating-chat-message-meta';
            sender.textContent = `${message.sender} · ${new Date(message.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`;
            const text = document.createElement('span');
            text.textContent = message.text;
            bubble.append(sender, text);
            messageList.append(bubble);
        });
        messageList.scrollTop = messageList.scrollHeight;
    }

    async function refreshConversations() {
        try {
            const response = await fetch(conversationsUrl, { headers: { Accept: 'application/json' }, cache: 'no-store' });
            if (!response.ok) return;
            const data = await response.json();
            conversations = data.conversations || [];
            setUnreadCount(data.unread_count);
            renderConversations();
            if (selectedId && !conversations.some((item) => Number(item.id) === Number(selectedId))) {
                selectedId = null;
                title.textContent = 'Choose an exchange';
                context.textContent = '';
                messageList.replaceChildren();
                composer.hidden = true;
            }
            if (!windowEl.hidden && !windowEl.classList.contains('is-minimized') && !selectedId && conversations.length) {
                loadMessages(conversations[0].id);
            }
        } catch (_) {
            // A temporary network failure leaves the locally displayed conversation available.
        }
    }

    async function loadMessages(id) {
        const conversationId = Number(id);
        if (activeMessageLoadId === conversationId) return;
        const conversation = conversations.find((item) => Number(item.id) === Number(id));
        if (!conversation) return;
        selectedId = conversationId;
        activeMessageLoadId = conversationId;
        status.textContent = '';
        title.textContent = conversation.other_user;
        context.textContent = conversation.context;
        composer.hidden = false;
        renderConversations();
        try {
            const response = await fetch(endpointFor(id), { headers: { Accept: 'application/json' }, cache: 'no-store' });
            if (!response.ok) {
                if (selectedId === conversationId) {
                    status.textContent = response.status === 403 ? 'This exchange is no longer available for messaging.' : 'Unable to load this conversation.';
                }
                return;
            }
            const data = await response.json();
            if (selectedId !== conversationId) return;
            renderMessages(data.messages || []);
            await refreshConversations();
        } catch (_) {
            if (selectedId === conversationId) status.textContent = 'Connection lost. Try again in a moment.';
        } finally {
            if (activeMessageLoadId === conversationId) activeMessageLoadId = null;
        }
    }

    launch.addEventListener('click', () => {
        if (windowEl.classList.contains('is-minimized')) {
            windowEl.classList.remove('is-minimized');
            launch.setAttribute('aria-expanded', 'true');
            minimizeButton.textContent = '−';
            minimizeButton.setAttribute('aria-label', 'Minimize messages');
            return;
        }
        const isOpening = windowEl.hidden;
        windowEl.hidden = !isOpening;
        root.classList.toggle('is-open', isOpening);
        windowEl.classList.remove('is-minimized');
        launch.setAttribute('aria-expanded', String(isOpening));
        if (isOpening) refreshConversations();
        if (isOpening && !selectedId && conversations.length) loadMessages(conversations[0].id);
    });

    document.getElementById('chat-close').addEventListener('click', () => {
        windowEl.hidden = true;
        root.classList.remove('is-open');
        windowEl.classList.remove('is-minimized');
        launch.setAttribute('aria-expanded', 'false');
    });

    minimizeButton.addEventListener('click', () => {
        const minimized = windowEl.classList.toggle('is-minimized');
        launch.setAttribute('aria-expanded', String(!minimized));
        minimizeButton.textContent = minimized ? '+' : '−';
        minimizeButton.setAttribute('aria-label', minimized ? 'Restore messages' : 'Minimize messages');
    });

    composer.addEventListener('submit', async (event) => {
        event.preventDefault();
        const text = messageInput.value.trim();
        if (!text || !selectedId) {
            status.textContent = 'Message cannot be empty.';
            return;
        }
        const targetId = selectedId;
        const button = composer.querySelector('button[type="submit"]');
        button.disabled = true;
        status.textContent = '';
        try {
            const response = await fetch(endpointFor(targetId), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf, Accept: 'application/json' },
                body: JSON.stringify({ text }),
            });
            const data = await response.json();
            if (!response.ok) {
                status.textContent = data.error || 'Unable to send this message.';
                return;
            }
            if (selectedId === targetId) messageInput.value = '';
            await loadMessages(targetId);
        } catch (_) {
            status.textContent = 'Message could not be sent. Check your connection and try again.';
        } finally {
            button.disabled = false;
        }
    });

    refreshConversations();
    window.setInterval(refreshConversations, 12000);
    window.setInterval(() => {
        if (!windowEl.hidden && !windowEl.classList.contains('is-minimized') && selectedId) loadMessages(selectedId);
    }, 5000);
})();
