import "./index.less";
import SaiStyleColorPicker from "../lib/SaiStyleColorPicker";

let pickerEl: HTMLElement = document.querySelector("#picker");
let config = { inlineStyle: false };
let saiPicker = new SaiStyleColorPicker(pickerEl, config);

let colorPreview: HTMLElement = document.querySelector("[data-color-preview]");
let colorName: HTMLElement = document.querySelector("[data-color-name]");

saiPicker.on("update", function (color: string) {
    colorPreview.style.backgroundColor = color;
    colorName.innerText = color;
});
