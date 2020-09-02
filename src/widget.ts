// Copyright (c) wangsijie
// Distributed under the terms of the Modified BSD License.

import {
  DOMWidgetModel, DOMWidgetView, ISerializers
} from '@jupyter-widgets/base';

import {
  MODULE_NAME, MODULE_VERSION
} from './version';

// Import the CSS
import '../css/widget.css'
import cropImageFromCanvas from './crop';


declare global {
  interface Window {
    __ipyturtle_get_image_data?: Function;
  }
}

export
class TurtleModel extends DOMWidgetModel {
  defaults() {
    return {...super.defaults(),
      _model_name: TurtleModel.model_name,
      _model_module: TurtleModel.model_module,
      _model_module_version: TurtleModel.model_module_version,
      _view_name: TurtleModel.view_name,
      _view_module: TurtleModel.view_module,
      _view_module_version: TurtleModel.view_module_version,
    };
  }

  static serializers: ISerializers = {
      ...DOMWidgetModel.serializers,
      // Add any extra serializers here
    }

  static model_name = 'TurtleModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'TurtleView';   // Set to null if no view
  static view_module = MODULE_NAME;   // Set to null if no view
  static view_module_version = MODULE_VERSION;
}


export
class TurtleView extends DOMWidgetView {
  div?: HTMLElement;
  canvas?: HTMLCanvasElement;
  clearImageData?: ImageData;
  imageData?: ImageData;
  isTurtleOn: boolean = true;

  lastCommandId: number = 0;
  render() {
    this.el.classList.add('turtle-widget');
    this.div = document.createElement('div');
    const isCanvasFixed: boolean = this.model.get('is_canvas_fixed');
    const canvasWidth: number = this.model.get('canvas_width');
    const canvasHeight: number = this.model.get('canvas_height');
    if (isCanvasFixed) {
      this.div.style.position = 'fixed';
    } else {
      this.div.style.position = 'static';
    }
    this.div.style.right = '50px';
    this.div.style.top = '140px';
    this.div.style.width = canvasWidth + 'px';
    this.div.style.height = canvasHeight + 'px';
    this.div.style.border = 'thin solid #0000FF'
    this.div.style.background = '#efefef';
    this.div.style.cursor = 'move';
    this.div.style.zIndex = '999';
    this.div.className = 'turtle_div';
    this.div.setAttribute('draggable', 'true');
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('width', canvasWidth.toString());
    this.canvas.setAttribute('height', canvasHeight.toString());
    this.canvas.style.width = canvasWidth +'px';
    this.canvas.style.height = canvasHeight + 'px';
    this.div.appendChild(this.canvas);
    this.el.appendChild(this.div);
    this.canvas.className = 'turtle_canvas';
    const context = this.canvas.getContext('2d');
    this.clearImageData = context!.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
    this.drawTurtle();
    this.bindMouseEvent(); // 点击可拖动窗口
    this.registerHooks();
    this.update(); // 恢复历史情况
  }

  drawTurtle() {
    if (!this.model.get('is_turtle_on')) {
      return;
    }
    const turtleLocationX = Math.round(this.model.get('turtle_location_x'));
    const turtleLocationY = Math.round(this.model.get('turtle_location_y'));
    const turtleHeadingX = Math.round(this.model.get('turtle_heading_x'));
    const turtleHeadingY = Math.round(this.model.get('turtle_heading_y'));
    const turtleWidth = this.model.get('turtle_width');
    const turtleHeight = this.model.get('turtle_height');

    const hX = 0.5 * turtleHeight * turtleHeadingX;
    const hY = 0.5 * turtleHeight * turtleHeadingY;

    const noseX = turtleLocationX + hX;
    const noseY = turtleLocationY + hY;

    const leftLegX = turtleLocationX - 0.5 * turtleWidth * turtleHeadingY - hX;
    const leftLegY = turtleLocationY + 0.5 * turtleWidth * turtleHeadingX - hY;

    const rightLegX = turtleLocationX + 0.5 * turtleWidth * turtleHeadingY - hX;
    const rightLegY = turtleLocationY - 0.5 * turtleWidth * turtleHeadingX - hY;
    const color: string = this.model.get('color');
    
    const context = this.canvas!.getContext('2d') as CanvasRenderingContext2D;
    context.save();
    context.setTransform(1, 0, 0, -1, this.canvas!.width / 2, this.canvas!.height / 2);
    // 保存当前画面（不包含turtle三角形，用于恢复）
    this.imageData = context.getImageData(0, 0, this.canvas!.width, this.canvas!.height);
    context.strokeStyle = color;
    context.beginPath();
    context.moveTo(noseX, noseY);
    context.lineTo(rightLegX, rightLegY);
    context.lineTo(leftLegX, leftLegY);
    context.closePath();
    context.stroke();
    context.restore();
  }

  // 去掉turtle三角形
  clearTurtle() {
    if (!this.imageData) return;
    this.canvas!.getContext('2d')!.putImageData(this.imageData, 0,0);
    this.imageData = undefined;  
  }

  clear() {
    this.canvas!.getContext('2d')!.putImageData(this.clearImageData as ImageData, 0, 0);
  }

  bindMouseEvent() {
    let x = 0;
    let y = 0;
    let x1 = 0;
    let y1 = 0;
    this.div!.addEventListener('dragstart', (e) => {
      x1 = e.clientX;
      y1 = e.clientY;
    }, false);
    this.div!.addEventListener('drag', (e) => {
      e.preventDefault();
      if (!e.clientX) {
        return;
      }
      x = x1 - e.clientX;
      y = y1 - e.clientY;
      x1 = e.clientX;
      y1 = e.clientY;
      this.div!.style.top = (this.div!.offsetTop - y) + 'px';
      this.div!.style.left = (this.div!.offsetLeft - x) + 'px';
    });
    this.div!.addEventListener('dragover', e => {
      e.preventDefault();
    });
  }

  update() {
    const commands = (this.model.get('commands') || []).filter((c: any) => c.id > this.lastCommandId);
    if (!commands.length) {
      return;
    }
    this.clearTurtle();
    
    commands.forEach((command: any) => {
      const { type, x, y, dx, dy, color, id, lineWidth } = command;
      if (id <= this.lastCommandId) {
        return;
      }
      if (type === 'line') {
        this.drawLine(x, y, dx, dy, color, lineWidth);
      } else if (type === 'clear') {
        this.clear();
      } else if (type === 'updateTurtle') {

      } else if (type === 'write') {
        const { text, align, font, x, y, color } = command;
        this.writeText(text, align, font, x, y, color);
      } else if (type === 'dot') {
        const { x, y, size, color } = command;
        this.drawDot(x, y, size, color);
      } else if (type === 'circle') {
        const { x, y, radius, color, extent, lineWidth } = command;
        this.drawCircle(x, y, radius, color, extent, lineWidth);
      }
      this.lastCommandId = id;
    })

    this.drawTurtle();
    
    return super.update();
  }

  drawLine(x: number, y: number, dx: number, dy: number, color: string, lineWidth: number) {
    const context = this.canvas!.getContext('2d') as CanvasRenderingContext2D;
    context.save();
    context.lineWidth = lineWidth;
    context.setTransform(1, 0, 0, -1, this.canvas!.width / 2, this.canvas!.height / 2);
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(dx, dy);
    context.strokeStyle = color;
    context.closePath();
    context.stroke();
    context.restore();
  }

  writeText(text: string, align: string, font: string[], x: number, y: number, color: string) {
    const context = this.canvas!.getContext('2d') as CanvasRenderingContext2D;
    context.save();
    const [family, size, weight] = font;
    context.font = `${family} ${size}px ${weight}`;
    const textX = x + this.canvas!.width / 2;
    const textY = -y + this.canvas!.height / 2;
    context.textAlign = align as CanvasTextAlign;
    context.fillStyle = color;
    context.fillText(text, textX, textY);
    context.restore();
  }

  drawDot(x: number, y: number, radius: number, color: string) {
    const context = this.canvas!.getContext('2d') as CanvasRenderingContext2D;
    context.save();
    context.setTransform(1, 0, 0, -1, this.canvas!.width / 2, this.canvas!.height / 2);
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI);
    context.fill();
    context.restore();
  }

  drawCircle(x: number, y: number, radius: number, color: string, extent: number, lineWidth: number) {
    const context = this.canvas!.getContext('2d') as CanvasRenderingContext2D;
    context.save();
    context.setTransform(1, 0, 0, -1, this.canvas!.width / 2, this.canvas!.height / 2);
    context.strokeStyle = color;
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI * (extent / 360));
    context.lineWidth = lineWidth;
    context.stroke();
    context.restore();
  }

  registerHooks() {
    // 外部可以获取图片内容
    window.__ipyturtle_get_image_data = (crop?: boolean) => new Promise((resolve, reject) => {
      const canvas = crop ? cropImageFromCanvas(this.canvas as HTMLCanvasElement) : this.canvas;
      canvas?.toBlob(async data => {
        const buffer = await data?.arrayBuffer()!;
        // let base64String = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        resolve(buffer);
      }, 'png');
    });
  }
}
