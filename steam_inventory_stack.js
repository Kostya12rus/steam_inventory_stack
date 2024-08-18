// ==UserScript==
// @name         Steam Stack Inventory
// @namespace    https://github.com/Kostya12rus/steam_inventory_stack/
// @supportURL   https://github.com/Kostya12rus/steam_inventory_stack/issues
// @version      1.0.0
// @description  Add a button in steam inventory for stack items
// @author       Kostya12rus
// @match        https://steamcommunity.com/profiles/*/inventory*
// @match        https://steamcommunity.com/id/*/inventory*
// @license      AGPL-3.0
// ==/UserScript==

(function() {
    'use strict';
    createButton();

    // Функция для создания кнопки
    function createButton() {
        const userSteamID = g_steamID;
        let { m_steamid } = g_ActiveInventory;
        let inProgress = false;
        if (userSteamID !== m_steamid) return;

        let token = document.querySelector("#application_config")?.getAttribute("data-loyalty_webapi_token");
        if (token) {
            token = token.replace(/"/g, "");
        }
        else {
            return;
        }

        const button = document.createElement("button");
        button.innerText = "Stack Inventory";
        button.classList.add("btn_darkblue_white_innerfade");
        button.style.width = "100%";
        button.style.height = "30px";
        button.style.lineHeight = "30px";
        button.style.fontSize = "15px";
        button.style.position = "relative";
        button.style.zIndex = "2";

        // Добавляем обработчик события клика
        button.addEventListener("click", async function() {
            if (inProgress) return;
            inProgress = true;
            await startStackInventory()
            inProgress = false;
        });
        async function stackItem(item, leaderItem) {
            const { amount, id: fromitemid } = item;
            const { id: destitemid } = leaderItem;
            const {m_appid, m_steamid} = g_ActiveInventory;
            const steamToken = token;
            const url = 'https://api.steampowered.com/IInventoryService/CombineItemStacks/v1/';

            const data = {
                'access_token': steamToken,
                'appid': m_appid,
                'fromitemid': fromitemid,
                'destitemid': destitemid,
                'quantity': amount,
                'steamid': m_steamid,
            };
            try {
                await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams(data).toString()
                });
            } catch (error) {
                // логирование ошибки, если необходимо
            }
        }
        async function startStackInventory() {
            const inventory = await getFullInventory();
            const totalItems = Object.values(inventory).reduce((sum, instanceDict) => {
                return sum + Object.values(instanceDict).reduce((instanceSum, items) => {
                    return instanceSum + items.length - 1; // -1 для исключения leaderItem
                }, 0);
            }, 0);
            if (totalItems < 2) {
                alert("Недостаточно предметов для объединения, либо не удалось получить список предметов. Пожалуйста, попробуйте позже");
                return;
            }

            let processedItems = 0;
            const progressModal = createProgressModal(totalItems);

            for (const classid in inventory) {
                if (inventory.hasOwnProperty(classid)) {
                    const instanceDict = inventory[classid];
                    for (const instanceid in instanceDict) {
                        if (instanceDict.hasOwnProperty(instanceid)) {
                            const items = instanceDict[instanceid];
                            if (items.length < 2) continue;
                            let leaderItem;
                            if (instanceid === "0") {
                                leaderItem = items[0];
                            } else {
                                leaderItem = items[items.length - 1];
                            }
                            for (const item of items) {
                                if (item === leaderItem) continue;
                                stackItem(item, leaderItem);
                                processedItems++;
                                updateProgressModal(progressModal, processedItems, totalItems);
                                await new Promise(resolve => setTimeout(resolve, 75));
                            }
                        }
                    }
                }
            }
            startCountdownAndClose(progressModal.overlay, progressModal.modal, progressModal.countdownText);
        }

        // Функция для создания модального окна
        function createProgressModal(totalItems) {
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            overlay.style.zIndex = '9999';

            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.padding = '20px';
            modal.style.backgroundColor = '#2c2c2c';
            modal.style.borderRadius = '8px';
            modal.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.5)';
            modal.style.zIndex = '10000';
            modal.style.textAlign = 'center';
            modal.style.color = '#fff';
            modal.style.width = '500px';

            const title = document.createElement('h3');
            title.innerText = 'Stacking Inventory Items...';
            title.style.margin = '0 0 10px 0';
            title.style.fontSize = '18px';
            title.style.fontWeight = 'bold';
            modal.appendChild(title);

            const progress = document.createElement('div');
            progress.style.marginTop = '10px';
            modal.appendChild(progress);

            const progressBar = document.createElement('div');
            progressBar.style.width = '100%';
            progressBar.style.height = '20px';
            progressBar.style.backgroundColor = '#444';
            progressBar.style.borderRadius = '4px';
            progressBar.style.overflow = 'hidden';
            progress.appendChild(progressBar);

            const progressFill = document.createElement('div');
            progressFill.style.height = '100%';
            progressFill.style.width = '0%';
            progressFill.style.backgroundColor = '#4caf50';
            progressFill.style.borderRadius = '4px';
            progressBar.appendChild(progressFill);

            const progressText = document.createElement('div');
            progressText.style.marginTop = '10px';
            progressText.style.fontSize = '14px';
            progressText.style.height = '20px';
            progressText.innerText = `0 of ${totalItems} items processed`;
            modal.appendChild(progressText);

            // Добавляем уникальный div для обратного отсчета
            const countdownText = document.createElement('div');
            countdownText.style.marginTop = '15px';
            countdownText.style.fontSize = '14px';
            countdownText.style.color = '#ffcc00';  // Используем желтый цвет для привлечения внимания
            modal.appendChild(countdownText);

            // Добавляем кнопку OK
            const closeButton = document.createElement('button');
            closeButton.innerText = 'Close';
            closeButton.style.marginTop = '20px';
            closeButton.style.padding = '10px 20px';
            closeButton.style.backgroundColor = '#4caf50';
            closeButton.style.border = 'none';
            closeButton.style.borderRadius = '4px';
            closeButton.style.color = '#fff';
            closeButton.style.fontSize = '14px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.transition = 'background-color 0.3s';

            closeButton.onmouseover = () => {
                closeButton.style.backgroundColor = '#45a049';
            };

            closeButton.onmouseout = () => {
                closeButton.style.backgroundColor = '#4caf50';
            };

            closeButton.onclick = () => closeProgressModal(overlay);

            modal.appendChild(closeButton);

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            return { modal, progressFill, progressText, countdownText, overlay };
        }

        // Функция для закрытия всплывающего окна с обратным отсчетом
        function startCountdownAndClose(overlay, modal, countdownText) {
            let countdown = 5;

            const interval = setInterval(() => {
                if (countdown > 0) {
                    countdownText.innerText = `Процесс завершен. Страница обновится через ${countdown} секунд...`;
                    countdown--;
                } else {
                    clearInterval(interval);
                    closeProgressModal(overlay);
                }
            }, 1000);
        }

        // Функция для закрытия всплывающего окна
        function closeProgressModal(overlay) {
            document.body.removeChild(overlay);
            window.location.reload();
        }

        // Функция для обновления прогресса
        function updateProgressModal({ progressFill, progressText }, processedItems, totalItems) {
            const progressPercentage = Math.round((processedItems / totalItems) * 100);
            progressFill.style.width = `${progressPercentage}%`;
            progressText.innerText = `${processedItems} of ${totalItems} items processed`;
        }

        async function getFullInventory() {
            try {
                const inventoryItems = await getInventoryItems();
                const itemDict = {};
                for (const itemData of inventoryItems) {
                    for (const item of Object.values(itemData)) {
                        const { classid, instanceid } = item;
                        if (!itemDict[classid]) {
                            itemDict[classid] = {};
                        }
                        if (!itemDict[classid][instanceid]) {
                            itemDict[classid][instanceid] = [];
                        }
                        itemDict[classid][instanceid].push(item);
                    }
                }
                return itemDict;
            } catch (error) {
                console.error("Ошибка при получении предметов инвентаря:", error);
            }
            return {};
        }
        function getInventoryItems(start = 0, inventoryItems = []) {
            const {m_appid, m_contextid, m_steamid} = g_ActiveInventory;
            const url = `https://steamcommunity.com/profiles/${m_steamid}/inventory/json/${m_appid}/${m_contextid}/?start=${start}`;

            return fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.success) {
                    throw new Error("Не удалось получить данные инвентаря.");
                }
                inventoryItems = inventoryItems.concat(data.rgInventory || []);
                if (data.more) {
                    const more_start = data.more_start || 0;
                    if (Number.isInteger(more_start) && more_start > 0) {
                        return getInventoryItems(more_start, inventoryItems);
                    }
                }
                return inventoryItems;
            })
            .catch(error => {
                console.error("Ошибка проверки инвентаря:", error);
                throw error;
            });
        }


        // Функция для обновления текста кнопки с логированием
        function updateButtonText() {
            const gameNameElement = document.querySelector('.name_game');
            if (gameNameElement) {
                button.innerText = "Stack Inventory " + gameNameElement.textContent.trim();
            }
        }

        // Функция для ожидания появления элемента
        function waitForElement(selector) {
            return new Promise((resolve) => {
                const observer = new MutationObserver((mutations, observer) => {
                    if (document.querySelector(selector)) {
                        observer.disconnect();
                        resolve(document.querySelector(selector));
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
            });
        }

        // Наблюдатель для изменений в элементе с классом name_game с логированием
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    updateButtonText();
                }
            });
        });

        // Настройка наблюдателя
        waitForElement('.name_game').then((target) => {
            observer.observe(target, { childList: true, subtree: true, characterData: true });
            updateButtonText(); // Обновление текста кнопки сразу после установки наблюдателя
        });

        // Вставка кнопки с логированием
        const referenceElement = document.querySelector('#tabcontent_inventory');
        if (referenceElement) {
            referenceElement.parentNode.insertBefore(button, referenceElement);
            updateButtonText();
        }
    }
})();
