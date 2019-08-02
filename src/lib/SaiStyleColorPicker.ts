
import "./picker.less";

/*------------------------------------------------------------------------*\

  # classes

\*------------------------------------------------------------------------*/

class SaiStyleColorPicker {

    // mini pub/sub
    private subscriptions: any = {};

    // config (options)
    private defaultConfig = {

        // [public] designed for modification
        size: 207,
        thickness: 21,
        startAngle: 330,
        backgroundColor: "#fff",
        borderColor: "#acacac",
        initColor: "#fff",
        inlineStyle: true,

        // [reserved] modified not recommended
        matteBorderWidth: 2,
        realBorderWidth: 1,
        realBorderOffset: 1,
        innerBorderGapRadian: Math.PI / 180
    };
    private wheelPanelOptions: any = {};

    // control variables
    private colorControl: Color = new Color(0, 0, 1);
    private centerPoint: any = {
        x: 0,
        y: 0
    };
    private posControl: any = {
        innerRadius: 0,
        outerRadius: 0,
        middleRadius: 0,
        squareSize: 0
    };
    private eventControl: any = {
        mousemove: false
    };

    // dom elements
    private el: HTMLElement;
    private pickingAreaContainer: HTMLElement;
    private pickingArea: HTMLElement;
    private huePicker: HTMLElement;
    private colorPicker: HTMLElement;

    public constructor(el: HTMLElement, config: Object = {}) {
        this.wheelPanelOptions = {...this.defaultConfig, ...config};
        this.el = el;
        this.init();
    }

    public getColor(type?: String) {
        
        switch (type) {

            case "object:rgb": {
                return {
                    r: this.colorControl.red,
                    g: this.colorControl.green,
                    b: this.colorControl.blue
                }
            }

            case "object:hsv": {
                return {
                    h: this.colorControl.hue,
                    s: this.colorControl.saturation,
                    v: this.colorControl.value
                }
            }

            case "hsl": {
                let {hue, saturation, value} = this.colorControl;
                let lightness;
                [hue, saturation, lightness] = Color.hsv2hsl(hue, saturation, value);
                return `hsl(${Math.round(hue)}, ${+(saturation * 100).toFixed(1)}%, ${+(lightness * 100).toFixed(1)}%)`;
            }

            case "rgb": {
                return this.colorControl.toColorString();
            }

            case "hex":
            default: {
                let {red, green, blue} = this.colorControl;
                return Color.rgb2hex(red, green, blue);
            }

        }
    }

    public setColor(color: string) {
        color = color.trim();
        let hue, saturation, value;
        let lightness;

        // #fff
        if (color.charAt(0) === "#") {
            let [red, green, blue] = Color.hex2rgb(color);
            [hue, saturation, lightness] = Color.rgb2hsl(red, green, blue);
            [hue, saturation, value] = Color.hsl2hsv(hue, saturation, lightness);

        // rgb(255, 255, 255)
        // rgb(100%, 100%, 100%)
        } else if (color.includes("rgb")) {
            let reg = /rgb\((.+)\)/;
            let valueString = reg.exec(color)[1];
            let valueArray;
            let red, green, blue;

            if (valueString.includes("%")) {
                valueArray = valueString.replace(/%/g, "").split(",");
                [red, green, blue] = valueArray.map(item => {
                    return +item / 100 * 255;
                });
                [hue, saturation, lightness] = Color.rgb2hsl(red, green, blue);

            } else {
                valueArray = valueString.split(",");
                [red, green, blue] = valueArray.map(item => {
                    return +item;
                });
                [hue, saturation, lightness] = Color.rgb2hsl(red, green, blue);
            }
            
        // hsl(192, 0%, 100%)
        } else if (color.includes("hsl")) {
            let reg = /hsl\((.+)\)/;
            let valueString = reg.exec(color)[1];
            let valueArray;

            valueArray = valueString.split(",");
            [hue, saturation, lightness] = valueArray.map(item => {
                return item.includes("%") ? +item.replace("%", "") / 100 : +item;
            });

        } else {
            throw new Error("Not a valid color string.")
        }

        [hue, saturation, value] = Color.hsl2hsv(hue, saturation, lightness);

        this.colorControl.hue = hue;
        this.colorControl.saturation = saturation;
        this.colorControl.value = value;
        this.colorControl.refreshByHSV();
        this.refreshColorDisplay();
    }

    public on(event: string, fn: Function) {
        this.subscriptions[event] = this.subscriptions[event] || [];
        this.subscriptions[event].push(fn);
    }

    public off(event: string, fn: Function) {
        let eventSubscriptions = this.subscriptions[event];
        let index = eventSubscriptions.indexOf(fn);

        if (index > -1) {
            eventSubscriptions.splice(index, 1);
        }
    }

    private emit(event: string, ...args: any[]) {
        let eventSubscriptions = this.subscriptions[event];

        if (eventSubscriptions) {
            for (let i = 0; i < eventSubscriptions.length; i++) {
                let fn = eventSubscriptions[i];
                fn.apply(this, args);
            }
        }
    }

    private init() {
        this.genElements();
        this.setColor(this.wheelPanelOptions.initColor);
        this.bindEvents();
    }

    // DOM ref:
    // <div class="sai-picking-area-container">
    //   <div class="sai-picking-area" style="background-color: #ff1e00;">
    //     <div class="sai-color-picker"></div>
    //   </div>
    //   <div class="sai-hue-picker"></div>
    // </div>
    private genElements() {
        let fragment = document.createDocumentFragment();
        let frameCanvas = this.createFrameCanvas();

        // styles for elements
        let pickingAreaContainerStyle = {
            width: this.wheelPanelOptions.size + "px",
            height: this.wheelPanelOptions.size + "px",
            padding: Math.round((this.wheelPanelOptions.size - this.posControl.squareSize) / 2) + "px",
            background: `${this.wheelPanelOptions.backgroundColor} url(${frameCanvas.toDataURL()}) center center no-repeat`
        };

        // element 1: color picker
        let colorPicker = document.createElement("div");
        colorPicker.className = "sai-color-picker";

        // element 2: picking area
        let pickingArea = document.createElement("div");
        pickingArea.className = "sai-picking-area";

        // element 3: hue picker
        let huePicker = document.createElement("div");
        huePicker.className = "sai-hue-picker";

        // container element: picking area container
        let pickingAreaContainer = document.createElement("div");
        pickingAreaContainer.className = "sai-picking-area-container";
        this.setStyleCombined(pickingAreaContainer, pickingAreaContainerStyle);

        // use inline style if needed
        if (this.wheelPanelOptions.inlineStyle) {
            let pickerStyle = {
                position: "absolute",
                width: "10px",
                height: "10px",
                margin: "-5px 0 0 -5px",
                borderWidth: "2px",
                borderStyle: "solid",
                borderRadius: "50%",
                boxSizing: "border-box"
            };
            let pickingAreaStyle = {
                position: "relative",
                height: "100%"
            };
            let pickingAreaContainerBaseStyle = {
                position: "relative",
                boxSizing: "border-box"
            };
            this.setupPickingAreaGradient(pickingArea);
            this.setStyleCombined(colorPicker, pickerStyle);
            this.setStyleCombined(huePicker, pickerStyle);
            this.setStyleCombined(pickingArea, pickingAreaStyle);
            this.setStyleCombined(pickingAreaContainer, pickingAreaContainerBaseStyle);
        }


        // assembly and update DOM
        pickingArea.appendChild(colorPicker);
        pickingAreaContainer.appendChild(pickingArea);
        pickingAreaContainer.appendChild(huePicker);
        fragment.appendChild(pickingAreaContainer);
        this.el.appendChild(fragment);

        // save as private properties
        this.pickingAreaContainer = pickingAreaContainer;
        this.pickingArea = pickingArea;
        this.colorPicker = colorPicker;
        this.huePicker = huePicker;
    }

    private setStyleCombined(el: HTMLElement, styleObject: any) {
        let elStyle = el.style as { [key: string]: any };

        Object.keys(styleObject).forEach(key => {
            let value = styleObject[key];
            elStyle[key] = value;
        });
    }

    // less code ref:
    // background-image: linear-gradient(to top, #000 0%, rgba(#000, 0) 100%), linear-gradient(to right, #fff 0%, rgba(#fff, 0) 100%);
    private setupPickingAreaGradient(el: HTMLElement) {
        let gradientString = "linear-gradient(to top, #000 0%, rgba(#000, 0) 100%), linear-gradient(to right, #fff 0%, rgba(#fff, 0) 100%)";
        let gradientStringWebkit = "-webkit-gradient(linear, left bottom, left top, from(#000), to(rgba(0, 0, 0, 0))), -webkit-gradient(linear, left top, right top, from(#fff), to(rgba(255, 255, 255, 0)))";
        el.style.backgroundImage = gradientString;
        el.style.backgroundImage = gradientStringWebkit;
    }

    private bindEvents() {
        this.pickingAreaContainer.addEventListener("mousedown", (e) => {
            let pointX = e.clientX + window.pageXOffset;
            let pointY = e.clientY + window.pageYOffset;
            this.triggerDown(pointX, pointY);

            // prevent default drag
            e.preventDefault();
        });
    }

    private triggerDown(pointX: number, pointY: number) {
        let rect = this.pickingAreaContainer.getBoundingClientRect();
        this.centerPoint.x = (rect.left + rect.right) / 2 + window.pageXOffset;
        this.centerPoint.y = (rect.top + rect.bottom) / 2 + window.pageYOffset;

        let dx = pointX - this.centerPoint.x;
        let dy = pointY - this.centerPoint.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let squareZeroX = this.centerPoint.x - this.posControl.squareSize / 2;
        let squareZeroY = this.centerPoint.y - this.posControl.squareSize / 2;
        let squarePointX = pointX - squareZeroX;
        let squarePointY = pointY - squareZeroY;

        if (distance <= this.posControl.outerRadius && distance >= this.posControl.innerRadius) {
            this.triggerMoveForHue(pointX, pointY);
            this.startWatchMove("hue");
        } else if (squarePointX >= 0 && squarePointX <= this.posControl.squareSize &&
            squarePointY >= 0 && squarePointY <= this.posControl.squareSize) {
            this.triggerMoveForColor(pointX, pointY);
            this.startWatchMove("color");
        }
    }

    private startWatchMove(type: string) {
        const genMoveHandler = (triggerFn: Function) => {
            return function (e: any) {
                let pointX = e.clientX + window.pageXOffset;
                let pointY = e.clientY + window.pageYOffset;
                triggerFn(pointX, pointY);
            };
        };
        let eventControl = this.eventControl;
        let currentMoveHandler = type === "hue" ? genMoveHandler(this.triggerMoveForHue.bind(this)) 
        : genMoveHandler(this.triggerMoveForColor.bind(this));

        if (!eventControl.mousemove) {
            eventControl.mousemove = true;
            document.addEventListener("mousemove", currentMoveHandler);
            document.addEventListener("mouseup", function handleMouseup() {
                document.removeEventListener("mouseup", handleMouseup);
                document.removeEventListener("mousemove", currentMoveHandler);
                eventControl.mousemove = false;
            });
        }
    }

    private validateWithEdge(value: number, min: number, max: number) {
        if (value > max) {
            return max;
        } else if (value < 0) {
            return min;
        } else {
            return value;
        }
    }

    private triggerMoveForColor(pointX: number, pointY: number) {
        let squareZeroX = this.centerPoint.x - this.posControl.squareSize / 2;
        let squareZeroY = this.centerPoint.y - this.posControl.squareSize / 2;
        let squarePointX = this.validateWithEdge(pointX - squareZeroX, 0, this.posControl.squareSize);
        let squarePointY = this.validateWithEdge(pointY - squareZeroY, 0, this.posControl.squareSize);
        let percentX = squarePointX / this.posControl.squareSize;
        let percentY = squarePointY / this.posControl.squareSize;
        let hue = this.colorControl.hue;
        let saturation = percentX;
        let value = 1 - percentY;
        let targetColor = new Color(hue, saturation, value);

        this.colorControl = targetColor;
        this.refreshColorDisplay();
    }

    private triggerMoveForHue(pointX: number, pointY: number) {
        let dx = pointX - this.centerPoint.x;
        let dy = pointY - this.centerPoint.y;
        let phi = Math.atan2(dy, dx);
        let deg = rad2deg(phi);
        let hue = (deg + this.wheelPanelOptions.startAngle) % 360;

        this.colorControl.hue = hue;
        this.colorControl.refreshByHSV();
        this.refreshColorDisplay();
    }

    private refreshColorDisplay() {
        let hueColor = new Color(this.colorControl.hue, 1, 1);
        let pickerColorHue = (this.colorControl.hue + 180) % 360;
        let huePhi = deg2rad(this.colorControl.hue + 180 - this.wheelPanelOptions.startAngle);
        let huePickerX = this.posControl.middleRadius * Math.cos(huePhi) + this.wheelPanelOptions.size / 2;
        let huePickerY = this.posControl.middleRadius * Math.sin(huePhi) + this.wheelPanelOptions.size / 2;
        let huePickerColor = new Color(pickerColorHue, 1, 1);
        let colorPickerX = this.colorControl.saturation * this.posControl.squareSize;
        let colorPickerY = (1 - this.colorControl.value) * this.posControl.squareSize;
        let colorPickerColorSaturation = this.colorControl.value;
        let colorPickerColorValue = 1 - this.colorControl.value * (1 - this.colorControl.saturation);
        let colorPickerColor = new Color(pickerColorHue, colorPickerColorSaturation, colorPickerColorValue);

        this.pickingArea.style.backgroundColor = hueColor.toColorString();

        this.huePicker.style.borderColor = huePickerColor.toColorString();
        this.huePicker.style.left = huePickerX + "px";
        this.huePicker.style.top = huePickerY + "px";

        this.colorPicker.style.borderColor = colorPickerColor.toColorString();
        this.colorPicker.style.left = colorPickerX + "px";
        this.colorPicker.style.top = colorPickerY + "px";

        // event "update"
        this.emit("update", this.getColor());
    }

    private createFrameCanvas() {
        let frameCanvas = document.createElement("canvas");
        let ctx = frameCanvas.getContext("2d");

        frameCanvas.width = this.wheelPanelOptions.size;
        frameCanvas.height = this.wheelPanelOptions.size;

        this.drawHueWheel(ctx);
        return frameCanvas;
    }

    private drawHueWheel(ctx: CanvasRenderingContext2D) {

        // local variable here for "this.wheelPanelOptions"
        let wheelPanelOptions = this.wheelPanelOptions;
        let image = ctx.createImageData(wheelPanelOptions.size, wheelPanelOptions.size);
        let data = image.data;

        let radius = wheelPanelOptions.size / 2 - wheelPanelOptions.realBorderOffset - wheelPanelOptions.realBorderWidth;
        let innerRadius = radius - wheelPanelOptions.thickness;
        let outerRadius = radius;
        let centerX = wheelPanelOptions.size / 2;
        let centerY = wheelPanelOptions.size / 2;
        let pixelLength = 4;
        let rowLength = wheelPanelOptions.size;

        // save for picker control
        this.posControl.innerRadius = innerRadius;
        this.posControl.outerRadius = outerRadius;
        this.posControl.middleRadius = (innerRadius + outerRadius) / 2;
        this.posControl.squareSize = (((innerRadius - wheelPanelOptions.realBorderOffset) / Math.sqrt(2)) - wheelPanelOptions.realBorderOffset) * 2;

        for (let x = -radius; x < radius; x++) {
            for (let y = -radius; y < radius; y++) {
                let [r, phi] = xy2polar(x, y);

                if (r <= outerRadius && r >= innerRadius) {

                    let deg = rad2deg(phi);
                    let adjustedX = x + wheelPanelOptions.size / 2;
                    let adjustedY = y + wheelPanelOptions.size / 2;

                    let index = (adjustedX + (adjustedY * rowLength)) * pixelLength;
                    let hue = (deg + wheelPanelOptions.startAngle) % 360;

                    // the colors on the color wheel are all S:1, V:1
                    let saturation = 1;
                    let value = 1;

                    let [red, green, blue] = Color.hsv2rgb(hue, saturation, value);
                    let alpha = 255;

                    data[index] = red;
                    data[index + 1] = green;
                    data[index + 2] = blue;
                    data[index + 3] = alpha;
                }
            }
        }

        ctx.putImageData(image, 0, 0);

        // border to overwrite matte pixels
        ctx.lineWidth = wheelPanelOptions.matteBorderWidth;
        ctx.strokeStyle = wheelPanelOptions.backgroundColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.stroke();

        // real border
        ctx.lineWidth = wheelPanelOptions.realBorderWidth;
        ctx.strokeStyle = wheelPanelOptions.borderColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius + wheelPanelOptions.realBorderOffset, 0, Math.PI * 2);
        ctx.stroke();

        // inner border for picking area
        let radCollection = [
            [-Math.PI / 4 + wheelPanelOptions.innerBorderGapRadian, Math.PI / 4 - wheelPanelOptions.innerBorderGapRadian],
            [Math.PI / 4 + wheelPanelOptions.innerBorderGapRadian, Math.PI * 3 / 4 - wheelPanelOptions.innerBorderGapRadian],
            [Math.PI * 3 / 4 + wheelPanelOptions.innerBorderGapRadian, Math.PI * 5 / 4 - wheelPanelOptions.innerBorderGapRadian],
            [Math.PI * 5 / 4 + wheelPanelOptions.innerBorderGapRadian, Math.PI * 7 / 4 - wheelPanelOptions.innerBorderGapRadian]
        ];

        for (let i = 0; i < radCollection.length; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, innerRadius - wheelPanelOptions.realBorderOffset, radCollection[i][0], radCollection[i][1]);
            ctx.closePath();
            ctx.stroke();
        }
    }
}

class Color {

    // hsv
    // h: [0, 360]
    // s: [0, 1]
    // v: [0, 1]
    public hue: number;
    public saturation: number;
    public value: number;

    // rgb
    // r: [0, 255] | "int"
    // g: [0, 255] | "int"
    // b: [0, 255] | "int"
    public red: number;
    public green: number;
    public blue: number;

    public constructor(hue: number, saturation: number, value: number) {
        this.hue = hue;
        this.saturation = saturation;
        this.value = value;
        this.refreshByHSV();
    }

    // format "rgb()" as the color string
    public toColorString() {
        return `rgb(${this.red}, ${this.green}, ${this.blue})`;
    }

    public refreshByHSV() {
        let [red, green, blue] = Color.hsv2rgb(this.hue, this.saturation, this.value);
        this.red = Math.round(red);
        this.green = Math.round(green);
        this.blue = Math.round(blue);
    }

    // https://en.wikipedia.org/wiki/HSL_and_HSV
    public static hsv2rgb(hue: number, saturation: number, value: number) {
        let chroma = value * saturation;
        let hue1 = hue / 60;
        let x = chroma * (1 - Math.abs((hue1 % 2) - 1));
        let r1, g1, b1;
        if (hue1 >= 0 && hue1 <= 1) {
            ([r1, g1, b1] = [chroma, x, 0]);
        } else if (hue1 >= 1 && hue1 <= 2) {
            ([r1, g1, b1] = [x, chroma, 0]);
        } else if (hue1 >= 2 && hue1 <= 3) {
            ([r1, g1, b1] = [0, chroma, x]);
        } else if (hue1 >= 3 && hue1 <= 4) {
            ([r1, g1, b1] = [0, x, chroma]);
        } else if (hue1 >= 4 && hue1 <= 5) {
            ([r1, g1, b1] = [x, 0, chroma]);
        } else if (hue1 >= 5 && hue1 <= 6) {
            ([r1, g1, b1] = [chroma, 0, x]);
        }

        let m = value - chroma;
        let [r, g, b] = [r1 + m, g1 + m, b1 + m];
        return [255 * r, 255 * g, 255 * b];
    }

    // https://css-tricks.com/converting-color-spaces-in-javascript/
    public static rgb2hsl(r: number, g: number, b: number) {
        r /= 255;
        g /= 255;
        b /= 255;
        let cmin = Math.min(r, g, b),
            cmax = Math.max(r, g, b),
            delta = cmax - cmin,
            h = 0,
            s = 0,
            l = 0;

        if (delta == 0)
            h = 0;
        else if (cmax == r)
            h = ((g - b) / delta) % 6;
        else if (cmax == g)
            h = (b - r) / delta + 2;
        else
            h = (r - g) / delta + 4;

        h = Math.round(h * 60);

        if (h < 0)
            h += 360;

        l = (cmax + cmin) / 2;
        s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));;

        return [h, s, l];
    }

    public static hsl2hsv(h: number, s: number, l: number) {
        let v = s * Math.min(l, 1 - l) + l;
        return [h, v ? 2 - 2 * l / v : 0, v];
    }

    public static hsv2hsl(h: number, s: number, v: number) {
        let l = v - v * s / 2, m = Math.min(l, 1 - l);
        return [h, m ? (v - l) / m : 0, l];
    }

    // https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    // support shorthand form like "#fff"
    public static hex2rgb(hex: string) {
        let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });

        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        let [r, g, b] = [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];

        return [r, g, b];
    }

    // r, g, b should be "int"
    public static rgb2hex(r: any, g: any, b: any) {
        r = r.toString(16);
        g = g.toString(16);
        b = b.toString(16);

        if (r.length == 1)
            r = "0" + r;
        if (g.length == 1)
            g = "0" + g;
        if (b.length == 1)
            b = "0" + b;

        return "#" + r + g + b;
    }
}

/*------------------------------------------------------------------------*\

  # helper function

\*------------------------------------------------------------------------*/

function polar2xy(r: number, phi: number) {
    let x = r * Math.cos(phi);
    let y = r * Math.sin(phi);
    return [x, y];
}

function xy2polar(x: number, y: number) {
    let r = Math.sqrt(x * x + y * y);
    let phi = Math.atan2(y, x);
    return [r, phi];
}

function rad2deg(rad: number) {
    return ((rad + Math.PI) / (2 * Math.PI)) * 360;
}

function deg2rad(deg: number) {
    return (deg % 360) / 180 * Math.PI;
}

/*------------------------------------------------------------------------*\

  # export

\*------------------------------------------------------------------------*/

export default SaiStyleColorPicker;