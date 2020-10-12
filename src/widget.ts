// Copyright (c) wangsijie
// Distributed under the terms of the Modified BSD License.

import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
} from '@jupyter-widgets/base';

import { MODULE_NAME, MODULE_VERSION } from './version';

// Import the CSS
import '../css/widget.css';
import cropImageFromCanvas from './crop';

declare global {
  interface Window {
    __ipyturtle_get_image_data?: Function;
  }
}

function radians(angle: number) {
  return 2 * Math.PI * (angle / 360);
}
interface BaseCommand {
  id: number;
  isPenOn: boolean;
  isFilling: boolean;
  isAnimating: boolean;
  isTurtleOn: boolean;
  x: number;
  y: number;
  heading: number;
  color: string;
  lineWidth: number;
  fillColor: string;
}

interface SimpleCommand extends BaseCommand {
  type: 'reset' | 'updateTurtle' | 'beginFill' | 'endFill';
}

interface RotateCommand extends BaseCommand {
  type: 'left' | 'right';
  degree: number;
}

interface WriteCommand extends BaseCommand {
  type: 'write';
  text: string;
  align: string;
  font: string[];
}

interface DotCommand extends BaseCommand {
  type: 'dot';
  size: number;
  dotColor: string;
}

interface LineCommand extends BaseCommand {
  type: 'line';
  distance: number;
}

interface CircleCommand extends BaseCommand {
  type: 'circle';
  radius: number;
  extent: number;
}

interface SpiralCircleCommand extends BaseCommand {
  type: 'spiralCircle';
  steps: number;
  startRadius: number;
  radiusStride: number;
  angleStride: number;
}

interface SpiralForwardCommand extends BaseCommand {
  type: 'spiralForward';
  steps: number;
  startArcLength: number;
  arcLengthStride: number;
  angleStride: number;
}

type Command =
  | SimpleCommand
  | RotateCommand
  | WriteCommand
  | DotCommand
  | LineCommand
  | CircleCommand
  | SpiralCircleCommand
  | SpiralForwardCommand;

type FillPath =
  | { type: 'begin'; x: number; y: number; color: string }
  | {
      type: 'arc';
      x: number; // center
      y: number; // center
      radius: number;
      start: number;
      end: number;
      color: string;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      anticlockwise: boolean;
    }
  | {
      type: 'line';
      x: number;
      y: number;
      startX: number;
      startY: number;
      color: string;
    }
  | {
      type: 'dot';
      x: number;
      y: number;
      size: number;
      dotColor: string;
    }
  | {
      type: 'text';
      x: number;
      y: number;
      text: string;
      fontStyle: string;
      textColor: string;
      align: string;
    };

export class TurtleModel extends DOMWidgetModel {
  defaults() {
    return {
      ...super.defaults(),
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
  };

  static model_name = 'TurtleModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'TurtleView'; // Set to null if no view
  static view_module = MODULE_NAME; // Set to null if no view
  static view_module_version = MODULE_VERSION;
}

export class TurtleView extends DOMWidgetView {
  div?: HTMLElement;
  canvas?: HTMLCanvasElement;
  clearImageData?: ImageData;
  imageData?: ImageData;
  fillImageData?: ImageData;
  isTurtleOn: boolean = true;
  baseCommand: BaseCommand = {
    id: 0,
    isPenOn: true,
    isFilling: false,
    isTurtleOn: true,
    isAnimating: false,
    x: 0,
    y: 0,
    heading: 90,
    color: 'black',
    fillColor: 'black',
    lineWidth: 1,
  };

  fillPaths: FillPath[] = [];

  lastCommandId: number = 0;

  isExecCommands: boolean = false;
  render() {
    // console.log('render');

    this.el.classList.add('turtle-widget');
    this.div = document.createElement('div');
    const isCanvasFixed: boolean = this.model.get('_is_canvas_fixed');
    const canvasWidth: number = this.model.get('_canvas_width');
    const canvasHeight: number = this.model.get('_canvas_height');
    if (isCanvasFixed) {
      this.div.style.position = 'fixed';
    } else {
      this.div.style.position = 'static';
    }
    this.div.style.right = '50px';
    this.div.style.top = '140px';
    this.div.style.width = canvasWidth + 'px';
    this.div.style.height = canvasHeight + 'px';
    this.div.style.border = 'thin solid #0000FF';
    this.div.style.background = '#efefef';
    this.div.style.cursor = 'move';
    this.div.style.zIndex = '999';
    this.div.className = 'turtle_div';
    this.div.setAttribute('draggable', 'true');
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('width', canvasWidth.toString());
    this.canvas.setAttribute('height', canvasHeight.toString());
    this.canvas.style.width = canvasWidth + 'px';
    this.canvas.style.height = canvasHeight + 'px';
    this.div.appendChild(this.canvas);
    this.el.appendChild(this.div);
    this.canvas.className = 'turtle_canvas';
    const context = this.canvas.getContext('2d');
    this.clearImageData = context!.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    this.drawTurtle(this.baseCommand);
    this.bindMouseEvent(); // 点击可拖动窗口
    this.registerHooks();
    this.update(); // 恢复历史情况
  }

  bindMouseEvent() {
    let x = 0;
    let y = 0;
    let x1 = 0;
    let y1 = 0;
    this.div!.addEventListener(
      'dragstart',
      (e) => {
        x1 = e.clientX;
        y1 = e.clientY;
      },
      false
    );
    this.div!.addEventListener('drag', (e) => {
      e.preventDefault();
      if (!e.clientX) {
        return;
      }
      x = x1 - e.clientX;
      y = y1 - e.clientY;
      x1 = e.clientX;
      y1 = e.clientY;
      this.div!.style.top = this.div!.offsetTop - y + 'px';
      this.div!.style.left = this.div!.offsetLeft - x + 'px';
    });
    this.div!.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
  }

  update() {
    if (!this.isExecCommands) this.execCommands();
    return super.update();
  }

  async execCommands() {
    this.isExecCommands = true;
    let commands: Command[] = this.model.get('_commands') || [];
    let newCommands = commands.filter((c: any) => c.id > this.lastCommandId);

    if (newCommands.length > 0) {
      for (const command of newCommands) {
        // widget 被销毁了，停止循环
        if (!document.body.contains(this.el)) {
          return;
        }
        let { type, id } = command;
        if (id <= this.lastCommandId) {
          continue;
        }

        this.lastCommandId = id;
        this.baseCommand = command;
        this.clearTurtle();

        let afterTurtle = {};
        if (type === 'line') {
          afterTurtle = await this.drawLine(command as LineCommand);
        } else if (type === 'reset') {
          this.reset();
        } else if (type === 'beginFill') {
          this.beginFill(command as SimpleCommand);
        } else if (type === 'endFill') {
          this.endFill();
        } else if (type === 'updateTurtle') {
        } else if (type === 'left') {
          afterTurtle = await this.rotateLeft(command as RotateCommand);
        } else if (type === 'right') {
          afterTurtle = await this.rotateRight(command as RotateCommand);
        } else if (type === 'write') {
          this.writeText(command as WriteCommand);
        } else if (type === 'dot') {
          this.drawDot(command as DotCommand);
        } else if (type === 'circle') {
          afterTurtle = await this.drawCircle(command as CircleCommand);
        } else if (type === 'spiralCircle') {
          afterTurtle = await this.drawSpiralCircle(
            command as SpiralCircleCommand
          );
        } else if (type === 'spiralForward') {
          afterTurtle = await this.drawSpiralForward(
            command as SpiralForwardCommand
          );
        }
        this.drawTurtle({
          ...command,
          ...afterTurtle,
        });
        if (command.isAnimating) await this.waitFrame(20);
      }
    }

    commands = this.model.get('_commands') || [];
    newCommands = commands.filter((c: any) => c.id > this.lastCommandId);
    if (newCommands.length > 0) {
      await this.execCommands();
    } else {
      this.isExecCommands = false;
    }
  }

  drawContext(callback: (ctx: CanvasRenderingContext2D) => void) {
    const { lineWidth, color, fillColor } = this.baseCommand;
    const ctx = this.canvas!.getContext('2d') as CanvasRenderingContext2D;
    ctx.save();
    ctx.setTransform(
      1,
      0,
      0,
      -1,
      this.canvas!.width / 2,
      this.canvas!.height / 2
    );
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.fillStyle = fillColor;

    callback(ctx);

    ctx.restore();
  }

  waitFrame(ms: number = 20) {
    return new Promise((res) => {
      setTimeout(() => {
        requestAnimationFrame(res);
      }, ms);
    });
  }

  /**
   * 画出turtle，turtle的位置和朝向为可选参数，用于在同步前使用前端model更新turtle的位置
   * 如果为空，则使用后端model的数据
   * @param x x轴位置
   * @param y y轴位置
   * @param heading 朝向
   */
  drawTurtle(command: BaseCommand) {
    const { x, y, heading, color, fillColor, isTurtleOn } = command;
    // console.log('drawTurtle', x, y, heading);
    // console.log('drawTurtle', command);

    if (!isTurtleOn) {
      return;
    }
    const width = this.model.get('_turtle_width');
    const height = this.model.get('_turtle_height');

    const headingX = Math.cos(radians(heading));
    const headingY = Math.sin(radians(heading));

    const hX = height * headingX;
    const hY = height * headingY;

    const centerX = x - 0.7 * hX;
    const centerY = y - 0.7 * hY;

    const leftLegX = x - 0.5 * width * headingY - 1 * hX;
    const leftLegY = y + 0.5 * width * headingX - 1 * hY;

    const rightLegX = x + 0.5 * width * headingY - 1 * hX;
    const rightLegY = y - 0.5 * width * headingX - 1 * hY;

    this.drawContext((ctx) => {
      // 保存当前画面（不包含turtle三角形，用于恢复）
      this.imageData = ctx.getImageData(
        0,
        0,
        this.canvas!.width,
        this.canvas!.height
      );

      // 绘出turtle三角形
      ctx.strokeStyle = color;
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(rightLegX, rightLegY);
      ctx.lineTo(centerX, centerY);
      ctx.lineTo(leftLegX, leftLegY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }

  // 去掉turtle三角形
  clearTurtle() {
    // console.log('clearTurtle');

    if (!this.imageData) {
      // console.warn('clearTurtle 没有保存的无turtle的imageData');
      return;
    }
    this.canvas!.getContext('2d')!.putImageData(this.imageData, 0, 0);
    this.imageData = undefined;
  }

  reset() {
    this.fillPaths = [];
    this.canvas!.getContext('2d')!.putImageData(
      this.clearImageData as ImageData,
      0,
      0
    );
  }

  beginFill(command: SimpleCommand) {
    const { x, y, color } = command;
    this.drawContext((ctx) => {
      // 保存当前画面（不包含turtle三角形，用于恢复）
      this.fillImageData = ctx.getImageData(
        0,
        0,
        this.canvas!.width,
        this.canvas!.height
      );
    });
    this.fillPaths = [
      {
        type: 'begin',
        x,
        y,
        color,
      },
    ];
  }

  endFill() {
    this.drawContext((ctx) => {
      if (this.fillPaths.length <= 1) {
        this.fillPaths = [];
        return;
      }

      // console.log('endFill', this.fillPaths);

      // 还原beginFill之前的内容
      ctx.putImageData(this.fillImageData!, 0, 0);

      // 进行fill
      this.fillPaths.forEach((p) => {
        if (p.type === 'begin') {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        } else if (p.type === 'line') {
          ctx.lineTo(p.x, p.y);
        } else if (p.type === 'arc') {
          ctx.arc(
            p.x,
            p.y,
            p.radius,
            radians(p.start),
            radians(p.end),
            p.anticlockwise
          );
        }
      });
      ctx.closePath();
      ctx.fill();

      // 重新画线、圆、字、点
      this.fillPaths.forEach((p) => {
        if (p.type === 'begin') {
          // ctx.beginPath();
          // ctx.moveTo(p.x, p.y);
        } else if (p.type === 'line') {
          ctx.beginPath();
          ctx.save();
          ctx.strokeStyle = p.color;
          ctx.moveTo(p.startX, p.startY);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          ctx.restore();
        } else if (p.type === 'arc') {
          ctx.beginPath();
          ctx.save();
          ctx.strokeStyle = p.color;
          ctx.moveTo(p.startX, p.startY);
          ctx.arc(
            p.x,
            p.y,
            p.radius,
            radians(p.start),
            radians(p.end),
            p.anticlockwise
          );
          ctx.stroke();
          ctx.restore();
          // ctx.closePath();
        } else if (p.type === 'dot') {
          ctx.beginPath();
          ctx.save();
          ctx.fillStyle = p.dotColor;
          ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
          ctx.fill();
          ctx.restore();
        } else if (p.type === 'text') {
          ctx.save();
          ctx.font = p.fontStyle;
          ctx.textAlign = p.align as CanvasTextAlign;
          ctx.fillStyle = p.textColor;
          ctx.transform(1, 0, 0, -1, 0, 0);
          ctx.fillText(p.text, p.x, -p.y);
          ctx.restore();
        }
      });
      // ctx.closePath();
      // ctx.strokeStyle = color;
      // ctx.stroke();
    });
    this.fillPaths = [];
  }

  rotationSpeed = 10;

  async rotateLeft(command: RotateCommand) {
    const { degree, x, y, heading } = command;
    let d = 0;
    while (true) {
      d += this.rotationSpeed;
      if (d > degree) {
        d = degree;
      }
      this.drawTurtle({
        ...command,
        x,
        y,
        heading: heading + d,
      });
      if (command.isAnimating) await this.waitFrame(5);
      this.clearTurtle();
      if (d === degree) {
        break;
      }
    }
    return {
      heading: heading + d,
    };
  }

  async rotateRight(command: RotateCommand) {
    const { degree, x, y, heading } = command;
    let d = 0;
    while (true) {
      d += this.rotationSpeed;
      if (d > degree) {
        d = degree;
      }
      this.drawTurtle({
        ...command,
        x,
        y,
        heading: heading - d,
      });
      if (command.isAnimating) await this.waitFrame(20);

      this.clearTurtle();
      if (d === degree) {
        break;
      }
    }
    return {
      heading: heading - d,
    };
  }

  speed = 10;

  async drawLine(command: LineCommand) {
    let { distance, x, y, heading, isPenOn, isFilling, color } = command;

    const headingX = Math.cos(radians(heading));
    const headingY = Math.sin(radians(heading));
    let destX = x + distance * headingX;
    let destY = y + distance * headingY;
    let startX = x;
    let afterX = x;
    let startY = y;
    let afterY = y;
    let dir;
    if (distance > 0) {
      dir = 1;
    } else {
      dir = -1;
    }
    let i = 0;
    while (true) {
      i += this.speed * dir;
      if (Math.abs(i) >= Math.abs(distance)) {
        // 到达或超过目的地
        i = distance;
        afterX = destX;
        afterY = destY;
      } else {
        afterX += headingX * this.speed * dir;
        afterY += headingY * this.speed * dir;
      }
      if (isPenOn) {
        this.drawContext((ctx) => {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(afterX, afterY);
          ctx.closePath();
          ctx.stroke();
        });
      }

      x = afterX;
      y = afterY;
      this.drawTurtle({
        ...command,
        x,
        y,
      });
      if (command.isAnimating) await this.waitFrame(20);
      this.clearTurtle();
      if (i === distance) {
        break;
      }
    }

    if (isFilling) {
      this.fillPaths.push({
        type: 'line',
        color,
        x,
        y,
        startX,
        startY,
      });
    }

    return {
      x,
      y,
    };
  }

  writeText(command: WriteCommand) {
    const { text, align, font, x, y, color, isFilling } = command;
    const [family, size, weight] = font;

    const fontStyle = `${weight} ${size}px  ${family}`;
    this.drawContext((ctx) => {
      ctx.font = fontStyle;
      ctx.textAlign = align as CanvasTextAlign;
      ctx.fillStyle = color;
      ctx.transform(1, 0, 0, -1, 0, 0);
      ctx.fillText(text, x, -y);
    });
    if (isFilling) {
      this.fillPaths.push({
        type: 'text',
        text,
        textColor: color,
        x: x,
        y: y,
        fontStyle,
        align,
      });
    }
  }

  drawDot(command: DotCommand) {
    const { x, y, size, dotColor, isFilling } = command;
    this.drawContext((ctx) => {
      ctx.beginPath();
      ctx.fillStyle = dotColor;
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fill();
    });
    if (isFilling) {
      this.fillPaths.push({
        type: 'dot',
        dotColor,
        x: x,
        y: y,
        size,
      });
    }
  }

  async drawCircle(command: CircleCommand) {
    let { radius, extent, x, y, heading, isPenOn, isFilling, color } = command;
    // 默认为逆时针，但是因为context会被transform为笛卡尔坐标系，所以绘画时相反，为顺时针
    let anticlockwise = false;
    if (extent < 0) {
      anticlockwise = true;
    }
    let start: number, end: number;
    // if (anticlockwise) {
    //   start = 90 - heading;
    // } else {
    // }
    start = heading - 90;
    end = start + extent;
    const centerX = x + radius * Math.cos(radians(start + 180));
    const centerY = y + radius * Math.sin(radians(start + 180));

    // 根据速度计算在边长上的运行时长, 向上取整
    const distance = radians(Math.abs(extent)) * radius;
    const times = Math.ceil(distance / this.speed);
    const angleSpeed = extent / times;
    let cur = start;
    let endX;
    let endY;
    for (let t = 0; t < times; t++) {
      if (isPenOn) {
        this.drawContext((ctx) => {
          ctx.beginPath();
          ctx.arc(
            centerX,
            centerY,
            radius,
            radians(cur),
            radians(cur + angleSpeed),
            anticlockwise
          );
          ctx.stroke();
        });
      }

      cur += angleSpeed;
      endX = centerX + radius * Math.cos(radians(cur));
      endY = centerY + radius * Math.sin(radians(cur));
      this.drawTurtle({
        ...command,
        x: endX,
        y: endY,
        heading: cur + 90,
      });
      if (command.isAnimating) await this.waitFrame(20);
      this.clearTurtle();
    }

    endX = centerX + radius * Math.cos(radians(end));
    endY = centerY + radius * Math.sin(radians(end));
    heading = end + 90;

    if (isFilling) {
      this.fillPaths.push({
        type: 'arc',
        color,
        x: centerX,
        y: centerY,
        radius,
        start,
        end,
        startX: x,
        startY: y,
        endX: endX,
        endY: endX,
        anticlockwise,
      });
    }
    return {
      x: endX,
      y: endY,
      heading,
    };
  }

  async drawSpiralCircle(command: SpiralCircleCommand) {
    let {
      x,
      y,
      heading,
      steps,
      startRadius,
      radiusStride,
      angleStride,
    } = command;
    for (let i = 0; i < steps; i++) {
      const radius = startRadius + i * radiusStride;
      const after = await this.drawCircle({
        ...command,
        type: 'circle',
        x,
        y,
        heading,
        radius,
        extent: angleStride,
      });
      x = after.x;
      y = after.y;
      heading = after.heading;
      this.drawTurtle({
        ...command,
        x,
        y,
        heading,
      });
      if (command.isAnimating) await this.waitFrame(20);
      this.clearTurtle();
    }
    return {
      x,
      y,
      heading,
    };
  }

  async drawSpiralForward(command: SpiralForwardCommand) {
    let {
      x,
      y,
      heading,
      steps,
      startArcLength,
      arcLengthStride,
      angleStride,
    } = command;
    for (let i = 0; i < steps; i++) {
      const distance = startArcLength + i * arcLengthStride;

      const after = await this.drawLine({
        ...command,
        type: 'line',
        x,
        y,
        heading,
        distance,
      });
      x = after.x;
      y = after.y;
      const { heading: afterHeading } = await this.rotateLeft({
        ...command,
        type: 'left',
        x,
        y,
        heading,
        degree: angleStride,
      });
      heading = afterHeading;
      // this.drawTurtle({
      //   ...command,
      //   x,
      //   y,
      //   heading,
      // });
      // await this.waitFrame(20);
      // this.clearTurtle();
    }
    return {
      x,
      y,
      heading,
    };
  }

  registerHooks() {
    // 外部可以获取图片内容
    window.__ipyturtle_get_image_data = (crop?: boolean) =>
      new Promise((resolve, reject) => {
        const canvas = crop
          ? cropImageFromCanvas(this.canvas as HTMLCanvasElement)
          : this.canvas;
        canvas?.toBlob(async (data) => {
          const buffer = await data?.arrayBuffer()!;
          // let base64String = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          resolve(buffer);
        }, 'png');
      });
  }
}
