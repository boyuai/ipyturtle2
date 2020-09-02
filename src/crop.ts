export default function cropImageFromCanvas(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const pix: {
        x: number[];
        y: number[];
    } = { x: [], y: [] };
    const imageData = ctx!.getImageData(0, 0, width, height);
    let index = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            index = (y * width + x) * 4;
            if (imageData.data[index + 3] > 0) {
                pix.x.push(x);
                pix.y.push(y);
            }
        }
    }

    pix.x.sort(function (a, b) { return a - b });
    pix.y.sort(function (a, b) { return a - b });

    const n = pix.x.length - 1;
    const cropedWidth = 1 + pix.x[n] - pix.x[0];
    const cropedHeight = 1 + pix.y[n] - pix.y[0];
    const cut = ctx!.getImageData(pix.x[0], pix.y[0], cropedWidth, cropedHeight);

    const cropedCanvas = document.createElement('canvas');
    cropedCanvas.width = cropedWidth;
    cropedCanvas.height = cropedHeight;
    const cropedCtx = cropedCanvas.getContext('2d');
    cropedCtx!.putImageData(cut, 0, 0);
    return cropedCanvas;
}
