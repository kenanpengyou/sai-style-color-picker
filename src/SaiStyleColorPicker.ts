
import "./picker.less";

/*------------------------------------------------------------------------*\

  # classes

\*------------------------------------------------------------------------*/

class SaiStyleColorPicker {

    // mini pub/sub
    private subscriptions: any = {};

    // config (options)
    private defaultConfig = {
        size: 207,
        thickness: 21,
        matteBorderWidth: 2,
        realBorderWidth: 1,
        realBorderOffset: 1,
        innerBorderGapRadian: Math.PI / 180,
        startAngle: 330,
        backgroundColor: "#f8f8f8",
        borderColor: "#acacac"
    };
    private wheelPanelOptions: any = {};

    // control variables
    private colorControl: Color = new Color(196, 0.55, 0.95);
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
        this.wheelPanelOptions = Object.assign({}, this.defaultConfig, config);
        this.el = el;
        this.init();
    }

    public getColor() {
        return this.colorControl.toColorString();
    }

    public setColor(color: string) {

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
                fn.apply(null, args);
            }
        }
    }

    private init() {
        this.genElements();
        this.refreshColorDisplay();
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
            padding: (this.wheelPanelOptions.size - this.posControl.squareSize) / 2 + "px",
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
        } else {
            console.log("[triggerDown] else", pointX, pointY);
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
    // r: [0, 255]
    // g: [0, 255]
    // b: [0, 255]
    public red: number;
    public green: number;
    public blue: number;

    public constructor(hue: number, saturation: number, value: number) {
        this.hue = hue;
        this.saturation = saturation;
        this.value = value;
        this.refreshByHSV();
    }

    public toColorString() {
        let red = Math.round(this.red);
        let green = Math.round(this.green);
        let blue = Math.round(this.blue);
        return `rgb(${red}, ${green}, ${blue})`;
    }

    public refreshByHSV() {
        let [red, green, blue] = Color.hsv2rgb(this.hue, this.saturation, this.value);
        this.red = red;
        this.green = green;
        this.blue = blue;
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