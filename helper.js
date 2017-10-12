// функция получения элемента
function getElement(id) {
    return document.getElementById(id);
}

// функция отображения элемента
function showElement(id) {
    getElement(id).hidden = false;
}

// функция скрытия элемента
function hideElement(id) {
    getElement(id).hidden = true;
}