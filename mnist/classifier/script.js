const tf = window.tf;

class Canvas {
  constructor(canvasId, onImageDrawn) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.mousePressed = false;
    this.lastX = 0;
    this.lastY = 0;
    this.onImageDrawn = onImageDrawn;

    this.clearArea();
    this.initializeMouseHandlers();
  }

  initializeMouseHandlers() {
    this.canvas.addEventListener('mousedown', ((e) => {
      this.mousePressed = true;
      this.draw(e.offsetX, e.offsetY, false);
    }));

    this.canvas.addEventListener('mousemove', ((e) => {
      if (this.mousePressed) {
        this.draw(e.offsetX, e.offsetY, true);
      }
    }));

    this.canvas.addEventListener('mouseup', ((e) => {
      this.mousePressed = false;
      this.onImageDrawn();
    }));

    this.canvas.addEventListener('mouseleave', ((e) => {
      this.mousePressed = false;
    }));
  }

  draw(x, y, isDown) {
    x = x / 20;
    y = y / 20;
    if (isDown) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = 'white';
      this.ctx.fillStyle = 'white';
      this.ctx.lineWidth = '2';
      this.ctx.lineJoin = 'round';
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(x, y);
      this.ctx.closePath();
      this.ctx.stroke();
    }
    this.lastX = x;
    this.lastY = y;
    // console.log(`Drawn to ${x}, ${y}!`);
  }

  clearArea() {
    // Fill with black.
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

// From https://www.w3schools.com/howto/howto_js_sort_table.asp
function sortTable(table) {
  var rows, switching, i, x, y, shouldSwitch;
  switching = true;
  /* Make a loop that will continue until
  no switching has been done: */
  while (switching) {
    // Start by saying: no switching is done:
    switching = false;
    rows = table.rows;
    /* Loop through all table rows (except the
    first, which contains table headers): */
    for (i = 0; i < (rows.length - 1); i++) {
      // Start by saying there should be no switching:
      shouldSwitch = false;
      /* Get the two elements you want to compare,
      one from current row and one from the next: */
      x = rows[i].getElementsByTagName("TD")[1];
      y = rows[i + 1].getElementsByTagName("TD")[1];
      // Check if the two rows should switch place:
      if (parseFloat(x.innerHTML) > parseFloat(y.innerHTML)) {
        // If so, mark as a switch and break the loop:
        shouldSwitch = true;
        break;
      }
    }
    if (shouldSwitch) {
      /* If a switch has been marked, make the switch
      and mark that a switch has been done: */
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
    }
  }
}

async function showDebugInfo(image, predictions) {
  console.group('image');
  for (let i = 0; i < 28; ++i) {
    console.log(image.slice(i * 28, (i + 1) * 28).join(''));
  }
  console.groupEnd('image');
  console.group('probabilities');
  predictions.forEach((prob, idx) => {
    const barLength = Math.round(prob * 25);
    console.log(`${idx} ${'#'.repeat(barLength)}${' '.repeat(25-barLength)} ]`);
  });
  console.groupEnd('probabilities');
}

async function getPrediction(canvas, model) {
  console.group('predict');
  const prediction = tf.tidy(() => {
    // Reshape the image to 28x28 px and put in a batch of size 1.
    const imageTensor = tf.browser.fromPixels(canvas.canvas)
      .slice(0, [-1, -1, 1])
      .reshape([1, 28, 28, 1])
      .toFloat()
      .div(255.0);
    const predictions = model.predict(imageTensor);
    showDebugInfo(tf.round(imageTensor).dataSync(), predictions.dataSync());
    return predictions.argMax(1).arraySync()[0];
  });
  console.log(`classified as: ${prediction}`);
  console.groupEnd('predict');
  return prediction;
}

async function renderPrediction(canvas, prediction) {
  // Create a canvas element to render each example.
  const container = document.getElementById('predictions');
  const pred = document.createElement('tr');
  const predCanvasTd = document.createElement('td');

  const predCanvas = document.createElement('canvas');
  predCanvas.width = canvas.canvas.width * 2;
  predCanvas.height = canvas.canvas.height * 2;
  predCanvas.getContext('2d').drawImage(canvas.canvas, 0, 0, predCanvas.width, predCanvas.height);
  predCanvasTd.appendChild(predCanvas);
  pred.appendChild(predCanvasTd);

  const predTd = document.createElement('td');
  predTd.innerHTML = `${prediction}`;
  pred.appendChild(predTd);

  container.appendChild(pred);
  sortTable(container);

  canvas.clearArea();
}

async function run() {
  console.log('Initializing tf.js model');
  const model = await tf.loadLayersModel(
    'mnist_model_export/model.json');

  console.log('Initializing canvas');
  const canvas = new Canvas('number-canvas', () => {
    getPrediction(canvas, model).then(prediction => renderPrediction(canvas, prediction));
  });
}

document.addEventListener('DOMContentLoaded', run);
