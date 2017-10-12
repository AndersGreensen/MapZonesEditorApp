// spell-checker: words resultshow

//"use strict"

var yandexMap;
var searchControl;
var placeMark;
var deliveryZonePolygons;
var houseLevelZoom = 16;

var zones = [];
var editingZone;

const zoneDivPrefix = "zone_div_";

ymaps.ready(afterAPIInit);

// действия после инициализации API
function afterAPIInit() {
    var zoomControl = new ymaps.control.ZoomControl({
        options: {
            size: 'small',
            position: {
                bottom: 40,
                left: 10
            }
        }
    });
    
    searchControl = new ymaps.control.SearchControl({
        options: {
            noSelect: true,
            noPlacemark: true,
            size: 'small',
            position: {
                right: 10,
                top: 10
            }
        }
    });

    yandexMap = new ymaps.Map('map', {
        center: [55.76, 37.64],
        zoom: 9,
        controls: [zoomControl, searchControl]
    });

    yandexMap.cursors.push('arrow');
    yandexMap.behaviors.enable('scrollZoom');
    yandexMap.behaviors.disable('dblClickZoom');
    yandexMap.events.add('dblclick', onDoubleClickAtMap);

    searchControl.events.add('resultshow', onResultShowed);

    getElement("zoneColorInput").onchange = function () {
        if (editingZone) {
            editingZone.editPolygon.options.set("fillColor", getElement("zoneColorInput").value);
        }
    };

    getElement("addButton").onclick = function () {
        var newZone = {
            id: null,
            name: "Новая зона",
            color: "#D4FFCE"
        };
        showZoneEditPanel(newZone);
    };

    getElement("applyEditZoneButton").onclick = function () {
        if (!editingZone) {
            return;
        }

        var coordinates = editingZone.editPolygon.geometry.getCoordinates();
        if (coordinates[0].length < 3) {
            alert("В зоне задано менее 3 точек!");
            return;
        }

        editingZone.name = getElement("zoneNameInput").value;
        editingZone.color = getElement("zoneColorInput").value;
        editingZone.points = coordinates;

        if (editingZone.id == null) {
            editingZone.id = zones.length + 1;
            zones.push(editingZone);
        }

        saveZonesToLocalStorage();
        addZoneToList(editingZone);

        drawZone(editingZone, false);

        cancelEditingZone();
        hideElement("editZonePanel");
        showElement("addButton");
    };

    getElement("cancelEditZoneButton").onclick = function () {
        if (editingZone.id != null) {
            drawZone(editingZone, false);
        }

        cancelEditingZone();
        hideElement("editZonePanel");
        showElement("addButton");
    };

    loadZonesFromLocalStorage();

    displayZonesList();
    refreshZones();
};

// разворачивание/сворачивание поисковой панели
function setExpandStateOfSearchPanel(isExpanded) {
    searchControl.getLayout().then(function (layout) {
        layout.state.set('panelOpened', isExpanded);
        layout.state.set('popupOpened', true);
    });
};

// программное произведение поиска
function searchAddress(address) {
    searchControl.search(address);
    setExpandStateOfSearchPanel(true);
};

// действия при отображении результата поиска
function onResultShowed(e) {
    var index = e.get('index');

    searchControl.getResult(index).then(function (geoObject) {
        var coords = geoObject.geometry.getCoordinates();
    });

    setExpandStateOfSearchPanel(false);
};

// обработка двойного нажатия на карте
function onDoubleClickAtMap(e) {
    e.preventDefault();

    var coords = e.get('coords');
};

// доставание текущих координат метки
function getPlaceMarkCoords() {
    if (placeMark == null)
        return {
            isNull: true
        };

    var coords = placeMark.geometry.getCoordinates();
    return {
        isNull: false,
        latitude: coords[0],
        longitude: coords[1]
    };
};

// рисование зоны на карте
function drawZone(zoneInfo, isEdit) {
    if (!zoneInfo) {
        return;
    }

    var polygon = new ymaps.Polygon(zoneInfo.id != null ? zoneInfo.points : [], {
        hintContent: zoneInfo.name
    }, {
        editorDrawingCursor: "crosshair",
        fillColor: zoneInfo.color,
        strokeColor: '#000000',
        strokeWidth: 1,
        opacity: 0.7
    });

    yandexMap.geoObjects.add(polygon);

    if (isEdit) {
        zoneInfo.editPolygon = polygon;
    } else {
        zoneInfo.polygon = polygon;
    }
};

// перерисовка зон на карте
function refreshZones() {
    yandexMap.geoObjects.removeAll();

    if (!zones) {
        return;
    }

    zones.forEach(function (zone) {
        drawZone(zone, false);
    });
};

// поиск полигона по id
function searchPolygon(polygonId) {
    var findedPolygon = null;
    yandexMap.geoObjects.each(function (geoObject) {
        if (findedPolygon) {
            return;
        }

        if (geoObject.properties.get("id") == polygonId) {
            findedPolygon = geoObject;
            return;
        }
    });
};

// генерация элемента списка зон
function generateZoneElement(zoneInfo) {
    var container = document.createElement("div");
    container.id = zoneDivPrefix + zoneInfo.id;
    container.style.padding = "1em";

    var colorRectangle = document.createElement("div");
    colorRectangle.style.width = "25px";
    colorRectangle.style.height = "15px";
    colorRectangle.style.border = "1px solid black";
    colorRectangle.style.background = zoneInfo.color;
    colorRectangle.style.display = "inline-block";
    container.appendChild(colorRectangle);

    var zoneNameSpan = document.createElement("span");
    zoneNameSpan.innerText = zoneInfo.name;
    zoneNameSpan.style.padding = "0 5px";
    container.appendChild(zoneNameSpan);

    var editImage = document.createElement("img");
    editImage.style.width = "20px";
    editImage.style.height = "20px";
    editImage.src = "images/edit.png";

    var editButton = document.createElement("button");
    editButton.style.padding = 0;
    editButton.style.display = "inline";
    editButton.alt = "Редактировать зону";
    editButton.appendChild(editImage);
    editButton.onclick = function () {
        showZoneEditPanel(zoneInfo);
    };
    container.appendChild(editButton);

    var deleteImage = document.createElement("img");
    deleteImage.style.width = "20px";
    deleteImage.style.height = "20px";
    deleteImage.src = "images/delete.png";

    var deleteButton = document.createElement("button");
    deleteButton.style.padding = 0;
    deleteButton.style.display = "inline";
    deleteButton.alt = "Удалить зону";
    deleteButton.style.marginLeft = "10px";
    deleteButton.appendChild(deleteImage);
    deleteButton.onclick = function () {
        var isConfirmed = confirm("Вы действительно хотите удалить зону?");
        if (!isConfirmed) {
            return;
        }

        deleteZone(zoneInfo);
    };
    container.appendChild(deleteButton);

    return container;
};

// отображение списка зон
function displayZonesList() {
    zones.forEach(function (zone) {
        var zoneElement = generateZoneElement(zone);
        getElement("zonesListPanel").appendChild(zoneElement);
    });
};

// добавление зоны в список с заменой
function addZoneToList(zoneInfo) {
    var zonesPanel = getElement("zonesListPanel");
    var zoneElement = generateZoneElement(zoneInfo);

    var oldZoneElement = getElement(zoneDivPrefix + zoneInfo.id);
    if (oldZoneElement) {
        zonesPanel.insertBefore(zoneElement, oldZoneElement);
        zonesPanel.removeChild(oldZoneElement);
    } else {
        if (zonesPanel.children.length > 0) {
            zonesPanel.insertBefore(zoneElement, zonesPanel.children[0]);
        } else {
            zonesPanel.appendChild(zoneElement);
        }
    }
};

// удаление зоны
function deleteZone(zoneInfo) {
    var index = zones.indexOf(zoneInfo);
    zones.splice(index, 1);
    saveZonesToLocalStorage();

    yandexMap.geoObjects.remove(zoneInfo.polygon);

    var zonesPanel = getElement("zonesListPanel");
    var zoneElement = getElement(zoneDivPrefix + zoneInfo.id);
    zonesPanel.removeChild(zoneElement);
};

// отображение панели редактирования зоны
function showZoneEditPanel(zoneInfo) {
    editingZone = zoneInfo;

    hideElement("addButton");

    if (zoneInfo.id == null) {
        hideElement("editNameSpan");
        showElement("addNameSpan");
    } else {
        hideElement("addNameSpan");
        showElement("editNameSpan");

        yandexMap.geoObjects.remove(editingZone.polygon);
    }

    getElement("zoneNameInput").value = zoneInfo.name;
    getElement("zoneColorInput").value = zoneInfo.color;

    showElement("editZonePanel");

    drawZone(zoneInfo, true);

    zoneInfo.editPolygon.editor.startEditing();
    zoneInfo.editPolygon.editor.startDrawing();
};

// отмена редактирования зоны
function cancelEditingZone() {
    if (editingZone) {
        editingZone.editPolygon.editor.stopDrawing();
        editingZone.editPolygon.editor.stopEditing();

        yandexMap.geoObjects.remove(editingZone.editPolygon);
    }

    editingZone = null;
};

// загрузка зон из localStorage
function loadZonesFromLocalStorage() {
    var zonesString = localStorage.getItem("zones");
    if (zonesString) {
        zones = JSON.parse(zonesString);
    }
};

// сохранение зон в localStorage
function saveZonesToLocalStorage() {
    var zonesString = JSON.stringify(zones, ["id", "name", "color", "points"]);
    localStorage.setItem("zones", zonesString);
};