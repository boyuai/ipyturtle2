
# ipyturtle2

Turtle implemention for Jupyter Notebook

## Installation

if you use jupyterlab:

```bash
pip install ipyturtle2
jupyter labextension install @jupyter-widgets/jupyterlab-manager --minimize=False
jupyter labextension install ipyturtle2
```

If you are using Jupyter Notebook 5.2 or earlier, you may also need to enable
the nbextension:
```bash
pip install ipyturtle2
jupyter nbextension enable --py --sys-prefix ipyturtle2
```

## Supported Turtle Methods

1. back
2. circle: step is not supported
3. dot
4. forward
5. goto
6. heading
7. hideturtle
8. isdown
9. isvisible
10. left
11. pencolor
12. pendown
13. pensize
14. penup
15. position
16. reset
17. right
18. setpos
19. setposition
20. showturtle
21. write: move is not supported

All color params only support colorstring.

For method support request, please open an issue.

## Image Data Hook (pro use)

You can use the function `window.__ipyturtle_get_image_data` to get turtle panel drawing result.

```js
const crop = false; // Set true to auto crop to contents
window.__ipyturtle_get_image_data(crop).then(data => {
    console.log(data); // image buffer
    // to base64
    // const base64String = btoa(String.fromCharCode(...new Uint8Array(buffer)));
})
```

## Development

```bash
docker run --rm -it -p 8888:8888 -v $(pwd):/home/jovyan/ipyturtle2 jupyter/base-notebook bash
```

```bash
pip install -e ".[test, examples]"
jupyter nbextension install --sys-prefix --symlink --overwrite --py ipyturtle2
jupyter nbextension enable --sys-prefix --py ipyturtle2
jupyter notebook
```

```bash
jupyter labextension install @jupyter-widgets/jupyterlab-manager --no-build
jupyter labextension install --minimize=False .
jupyter lab
```

[http://localhost:8888](http://localhost:8888)

## Publish

```bash
python setup.py sdist bdist_wheel
pip install twine
twine upload dist/ipyturtle2-*
```
