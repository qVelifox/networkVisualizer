const workspace = document.getElementById('workspace');
const svg = document.getElementById('connections');
const sidebar = document.getElementById('sidebar');
let routers = [];
let connections = [];
let draggedRouter = null;
let offsetX = 0;
let offsetY = 0;
let currentTool = 'add';
let selectedRouter = null;
let notificationQueue = [];

function getToolbarHeight() {
    const el = document.getElementById('toolbar');
    return el ? el.offsetHeight : 52;
}

function showNotification(message, type = 'info') {
    if (notificationQueue.length >= 3) {
        const oldest = notificationQueue.shift();
        oldest.style.animation = 'slideOut 0.25s ease forwards';
        setTimeout(() => oldest.remove(), 250);
    }

    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;

    notif.style.top = `${getToolbarHeight() + 12 + notificationQueue.length * 56}px`;

    document.body.appendChild(notif);
    notificationQueue.push(notif);

    setTimeout(() => {
        const index = notificationQueue.indexOf(notif);
        if (index > -1) {
            notificationQueue.splice(index, 1);
            notif.style.animation = 'slideOut 0.25s ease forwards';
            setTimeout(() => {
                notif.remove();
                updateNotificationPositions();
            }, 250);
        }
    }, 3000);
}

function updateNotificationPositions() {
    notificationQueue.forEach((notif, index) => {
        notif.style.top = `${getToolbarHeight() + 12 + index * 56}px`;
        notif.style.transition = 'top 0.25s ease';
    });
}

function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });

    if (tool === 'add') {
        const b = document.getElementById('addBtn');
        b.classList.add('active');
        b.setAttribute('aria-pressed', 'true');
        workspace.style.cursor = 'crosshair';
        document.getElementById('toolStatus').textContent = 'Cliquez sur le graphe pour placer un routeur.';
    } else if (tool === 'connect') {
        const b = document.getElementById('connectBtn');
        b.classList.add('active');
        b.setAttribute('aria-pressed', 'true');
        workspace.style.cursor = 'pointer';
        document.getElementById('toolStatus').textContent = 'Cliquez sur deux routeurs pour les relier.';
    }

    selectedRouter = null;
    updateRouterVisuals();
}

workspace.addEventListener('click', function(e) {
    if (e.target === workspace && currentTool === 'add') {
        const rect = workspace.getBoundingClientRect();
        addRouter(e.clientX - rect.left, e.clientY - rect.top);
    }
});

function addRouter(x, y) {
    if (routers.length >= 26) {
        showNotification('Maximum 26 routeurs (A-Z)', 'warning');
        return;
    }

    const letter = String.fromCharCode(65 + routers.length);

    const routerDiv = document.createElement('div');
    routerDiv.className = 'router';
    routerDiv.textContent = letter;
    const half = 24;
    routerDiv.style.left = x - half + 'px';
    routerDiv.style.top = y - half + 'px';
    routerDiv.dataset.id = letter;

    routerDiv.addEventListener('mousedown', function(e) {
        e.stopPropagation();

        if (currentTool === 'connect') {
            handleRouterClick(letter);
        } else if (currentTool === 'add') {
            draggedRouter = routerDiv;
            const rect = workspace.getBoundingClientRect();
            offsetX = e.clientX - rect.left - parseInt(routerDiv.style.left, 10);
            offsetY = e.clientY - rect.top - parseInt(routerDiv.style.top, 10);
            routerDiv.classList.add('dragging');
        }
    });

    workspace.appendChild(routerDiv);

    routers.push({
        id: letter,
        element: routerDiv
    });

    showNotification(`Routeur ${letter} ajouté`, 'success');
    updateUI();
}

function handleRouterClick(routerId) {
    if (!selectedRouter) {
        selectedRouter = routerId;
        updateRouterVisuals();
        document.getElementById('toolStatus').textContent = `Routeur ${routerId} sélectionné — choisissez l’autre.`;
        showNotification(`Routeur ${routerId} sélectionné`, 'info');
    } else {
        if (selectedRouter !== routerId) {
            addConnection(selectedRouter, routerId);
            document.getElementById('toolStatus').textContent = 'Cliquez sur deux routeurs pour les relier.';
        } else {
            showNotification('Choisissez un autre routeur', 'warning');
        }
        selectedRouter = null;
        updateRouterVisuals();
    }
}

function updateRouterVisuals() {
    routers.forEach(r => {
        if (r.id === selectedRouter) {
            r.element.classList.add('selected');
        } else {
            r.element.classList.remove('selected');
        }
    });
}

function addConnection(from, to) {
    const exists = connections.find(
        c => (c.from === from && c.to === to) || (c.from === to && c.to === from)
    );

    if (exists) {
        showNotification('Cette connexion existe déjà', 'error');
        return;
    }

    connections.push({ from, to });
    drawConnections();
    showNotification(`Connexion ${from} ↔ ${to}`, 'success');
    updateUI();
}

function drawConnections() {
    svg.innerHTML = '';

    const c = 24;

    connections.forEach(conn => {
        const fromRouter = routers.find(r => r.id === conn.from);
        const toRouter = routers.find(r => r.id === conn.to);

        if (fromRouter && toRouter) {
            const x1 = parseInt(fromRouter.element.style.left, 10) + c;
            const y1 = parseInt(fromRouter.element.style.top, 10) + c;
            const x2 = parseInt(toRouter.element.style.left, 10) + c;
            const y2 = parseInt(toRouter.element.style.top, 10) + c;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('class', 'connection-line');
            svg.appendChild(line);
        }
    });
}

document.addEventListener('mousemove', function(e) {
    if (draggedRouter && currentTool === 'add') {
        const rect = workspace.getBoundingClientRect();
        const newX = e.clientX - rect.left - offsetX;
        const newY = e.clientY - rect.top - offsetY;

        draggedRouter.style.left = newX + 'px';
        draggedRouter.style.top = newY + 'px';

        drawConnections();
    }
});

document.addEventListener('mouseup', function() {
    if (draggedRouter) {
        draggedRouter.classList.remove('dragging');
        draggedRouter = null;
    }
});

function deleteRouter(routerId) {
    const router = routers.find(r => r.id === routerId);
    if (router) {
        router.element.remove();
        routers = routers.filter(r => r.id !== routerId);
        connections = connections.filter(c => c.from !== routerId && c.to !== routerId);
        drawConnections();
        showNotification(`Routeur ${routerId} supprimé`, 'success');
        updateUI();
        document.getElementById('routingSection').hidden = true;
    }
}

function clearAll() {
    if (routers.length > 0) {
        routers.forEach(r => r.element.remove());
        routers = [];
        connections = [];
        selectedRouter = null;
        svg.innerHTML = '';
        document.getElementById('routingSection').hidden = true;
        showNotification('Graphe réinitialisé', 'info');
        updateUI();
    }
}

function calculateRouting() {
    if (routers.length === 0) {
        showNotification('Ajoutez d’abord des routeurs', 'warning');
        return;
    }

    if (connections.length === 0) {
        showNotification('Créez d’abord des connexions', 'warning');
        return;
    }

    const tables = {};

    routers.forEach(router => {
        tables[router.id] = dijkstra(router.id);
    });

    displayRoutingTables(tables);
    showNotification('Routage calculé', 'success');
}

function dijkstra(start) {
    const distances = {};
    const previous = {};
    const unvisited = new Set();

    routers.forEach(r => {
        distances[r.id] = Infinity;
        previous[r.id] = null;
        unvisited.add(r.id);
    });

    distances[start] = 0;

    while (unvisited.size > 0) {
        let current = null;
        let minDist = Infinity;

        unvisited.forEach(node => {
            if (distances[node] < minDist) {
                minDist = distances[node];
                current = node;
            }
        });

        if (current === null) break;

        unvisited.delete(current);

        const neighbors = connections.filter(c => c.from === current || c.to === current);

        neighbors.forEach(conn => {
            const neighbor = conn.from === current ? conn.to : conn.from;
            const alt = distances[current] + 1;

            if (alt < distances[neighbor]) {
                distances[neighbor] = alt;
                previous[neighbor] = current;
            }
        });
    }

    const routingTable = {};
    routers.forEach(r => {
        if (r.id !== start) {
            let nextHop = r.id;
            let current = r.id;

            while (previous[current] !== start && previous[current] !== null) {
                current = previous[current];
            }

            if (previous[current] === start) {
                nextHop = current;
            }

            routingTable[r.id] = {
                destination: r.id,
                nextHop: distances[r.id] === Infinity ? '-' : nextHop,
                distance: distances[r.id] === Infinity ? '∞' : distances[r.id]
            };
        }
    });

    return routingTable;
}

function displayRoutingTables(tables) {
    const container = document.getElementById('routingTable');
    container.innerHTML = '';

    Object.keys(tables).forEach(routerId => {
        const routerDiv = document.createElement('div');
        routerDiv.className = 'router-name';
        routerDiv.textContent = `Routeur ${routerId}`;
        container.appendChild(routerDiv);

        const table = document.createElement('table');
        table.innerHTML = `
            <tr>
                <th>Destination</th>
                <th>Prochain saut</th>
                <th>Distance</th>
            </tr>
        `;

        Object.values(tables[routerId]).forEach(route => {
            const row = table.insertRow();
            row.innerHTML = `
                <td>${route.destination}</td>
                <td>${route.nextHop}</td>
                <td>${route.distance}</td>
            `;
        });

        container.appendChild(table);
    });

    document.getElementById('routingSection').hidden = false;
}

function updateUI() {
    document.getElementById('count').textContent = routers.length;
    document.getElementById('connectionCount').textContent = connections.length;

    const listDiv = document.getElementById('routerList');
    if (routers.length === 0) {
        listDiv.innerHTML = '<p class="router-list-empty">Aucun routeur pour l’instant.</p>';
    } else {
        listDiv.innerHTML = routers
            .map(
                r => `
            <div class="router-item">
                <div class="router-item-left">
                    <div class="router-badge">${r.id}</div>
                    <span>Routeur ${r.id}</span>
                </div>
                <button type="button" class="btn-delete-router" onclick="deleteRouter('${r.id}')" title="Supprimer" aria-label="Supprimer le routeur ${r.id}">×</button>
            </div>
        `
            )
            .join('');
    }
}

const resizer = document.getElementById('sidebarResizer');
let isResizing = false;

resizer.addEventListener('mousedown', function(e) {
    isResizing = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
});

document.addEventListener('mousemove', function(e) {
    if (!isResizing) return;

    let newWidth = window.innerWidth - e.clientX;
    if (newWidth < 220) newWidth = 220;
    if (newWidth > 560) newWidth = 560;

    sidebar.style.width = newWidth + 'px';
    workspace.style.right = newWidth + 'px';
    drawConnections();
});

document.addEventListener('mouseup', function() {
    if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
});
