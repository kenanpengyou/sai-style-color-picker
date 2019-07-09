# SAI Style Color Picker
A color picker designed similar to PaintTool SAI.

## Preview
![preview](https://raw.githubusercontent.com/kenanpengyou/sai-style-color-picker/master/intro/preview.png)

## Getting Started

### install

```
npm install sai-style-color-picker
```

or

```
yarn add sai-style-color-picker
```

### start

Basic implementation:

```js

// import SaiStyleColorPicker
import SaiStyleColorPicker from "sai-style-color-picker";

// choose the picker element
let pickerEl = document.querySelector("#picker");

// initialize the picker instance
let saiPicker = new SaiStyleColorPicker(pickerEl);

// link the picker to your actions
saiPicker.on("update", function (color) {
    // do anything using the selected color
});

```

## Documentation

### Configuration

When initializing the picker instance, you could pass a config object to customize the picker to some extent.

The config object and all config properties are optional. 

```js
let config = {

    // size (px) of the picker
    size: 207,

    // thickness (px) of the hue wheel
    thickness: 21,

    // the angle (degree) that will rotate the hue wheel
    startAngle: 330,

    // (for style)  background color
    backgroundColor: "#fff",

    // (for style) border color
    borderColor: "#acacac",

    // initial color of the picker
    initColor: "#fff",

    // use javascript inline style
    inlineStyle: true
}

let pickerEl = document.querySelector("#picker");
let saiPicker = new SaiStyleColorPicker(pickerEl, config);
```

### Inline Style

By default the elements of the picker are using javascript inline styles. You can choose to import the css styles by setting `inlineStyle` to `false`:

```js

// import css styles
import "sai-style-color-picker/dist/picker-base.css";

import SaiStyleColorPicker from "sai-style-color-picker";
let pickerEl = document.querySelector("#picker");
let saiPicker = new SaiStyleColorPicker(pickerEl, {

    // do not use javascript inline style
    inlineStyle: false
});
```
Compared with javascript inline styles, using css styles will neaten your html code and may be more stable for cross browser situations.

### API Reference

#### Methods

**getColor** - get the picker's color by serveral format

```js

// available format:
// "hex" - default
// "rgb"
// "hsl"
// "object:rbg"
// "object:hsv"
saiPicker.getColor("hex");
```

**setColor** - set the color of the picker instance

```js

// supported input color format: css <color> data type except keyword
saiPicker.setColor("#666");
saiPicker.setColor("rgb(191, 88, 88)");
saiPicker.setColor("hsl(0, 44.7%, 54.7%)");
```

#### Events

Only one event `update` is available. Invoked as the picker's color changes.

```js
saiPicker.on("update", function (color) {

    // "#d67272"
    console.log(color);

    // "rgb(214, 114, 114)"
    console.log(this.getColor("rgb"));

    // "hsl(0, 55.1%, 64.3%)"
    console.log(this.getColor("hsl"));
});
```
