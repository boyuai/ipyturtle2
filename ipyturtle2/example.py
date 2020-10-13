#!/usr/bin/env python
# coding: utf-8

# Copyright (c) wangsijie.
# Distributed under the terms of the Modified BSD License.

"""
TODO: Add module docstring
"""

from enum import Flag
from math import sqrt
from ipywidgets import DOMWidget
from traitlets import Unicode, Bool, Int, Float, Any
from ._frontend import module_name, module_version
import time
import math


class TurtleWidget(DOMWidget):
    """TODO: Add docstring here
    """
    _model_name = Unicode('TurtleModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('TurtleView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    _is_canvas_fixed = Bool(True).tag(sync=True)
    _canvas_width = Int(320).tag(sync=True)
    _canvas_height = Int(320).tag(sync=True)
    _is_turtle_on = Bool(True).tag(sync=True)
    _is_pen_on = True
    _is_filling = Bool(False).tag(sync=True)
    _is_animating = Bool(False).tag(sync=True)

    _turtle_height = Int(15).tag(sync=True)
    _turtle_width = Int(10).tag(sync=True)
    _turtle_location_x = Float(0.0).tag(sync=True)
    _turtle_location_y = Float(0.0).tag(sync=True)
    _turtle_heading = Float(90.0).tag(sync=True)

    _commands = Any([]).tag(sync=True)
    _color = Unicode('black').tag(sync=True)
    _fill_color = Unicode('black').tag(sync=True)
    _pen_size = Int(1).tag(sync=True)

    _command_id = 0

    def __init__(self, width=320, height=320, fixed=True):
        DOMWidget.__init__(self)
        self._canvas_width = width
        self._canvas_height = height
        self._is_canvas_fixed = fixed
        self._reset()

    def _reset(self):
        self._is_turtle_on = True
        self._is_pen_on = True
        self._is_animating = False
        self._is_filling = False
        self._turtle_location_x = 0
        self._turtle_location_y = 0
        self._turtle_heading = 90.0
        self._color = 'black'
        self._fill_color = 'black'

    def _incr_id(self):
        self._command_id += 1
        return self._command_id

    def _push_command(self, command):
        self._commands = self._commands + [{
            "id": self._incr_id(),
            "x": self._turtle_location_x,
            "y": self._turtle_location_y,
            "heading": self._turtle_heading,
            "color": self._color,
            "lineWidth": self._pen_size,
            "fillColor": self._fill_color,
            "isFilling": self._is_filling,
            "isAnimating": self._is_animating,
            "isPenOn": self._is_pen_on,
            "isTurtleOn": self._is_turtle_on,
            ** command,
        }]

    def filling(self):
        return self._is_filling

    def begin_fill(self):
        self._is_filling = True
        self._push_command({
            "type": "beginFill",
        })

    def end_fill(self):
        self._is_filling = False
        self._push_command({
            "type": "endFill",
        })

    def animating(self):
        return self._is_animating

    def begin_animation(self):
        self._is_animating = True

    def end_animation(self):
        self._is_animating = False

    def position(self):
        return self._turtle_location_x, self._turtle_location_y

    def abs(_, pos):
        return sqrt(pos[0] ** 2+pos[1] ** 2)

    def penup(self):
        self._is_pen_on = False

    def pendown(self):
        self._is_pen_on = True

    def forward(self, distance):
        self._push_command({
            "type": "line",
            "distance": distance,
        })
        self._turtle_location_x += math.cos(
            math.radians(self._turtle_heading)) * distance
        self._turtle_location_y += math.sin(
            math.radians(self._turtle_heading)) * distance

    def back(self, distance):
        self.forward(-distance)

    def heading(self):
        return self._turtle_heading

    def goto(self, x, y=None):
        if y is None:
            y = x[1]
            x = x[0]
        self._turtle_location_x = float(x)
        self._turtle_location_y = float(y)
        self._update_turtle()

    def setpos(self, x, y=None):
        return self.goto(x, y)

    def setposition(self, x, y=None):
        return self.goto(x, y)

    def left(self, degree=None):
        if degree is None:
            degree = 90
        self._push_command({
            "type": "left",
            "degree": degree
        })
        self._turtle_heading += degree
        self._turtle_heading = self._turtle_heading % 360

    def right(self, degree=None):
        if degree is None:
            degree = 90
        self._push_command({
            "type": "right",
            "degree": degree
        })
        self._turtle_heading -= degree
        self._turtle_heading = self._turtle_heading % 360

    def isdown(self):
        return self._is_pen_on

    def hideturtle(self):
        self._is_turtle_on = False
        self._update_turtle()

    def showturtle(self):
        self._is_turtle_on = True
        self._update_turtle()

    def isvisible(self):
        return self._is_turtle_on

    def reset(self):
        self._reset()
        self._push_command({
            "type": "reset",
        })

    def color(self, pen, fill):
        self.pencolor(pen)
        self.fillcolor(fill)

    def pencolor(self, r=-1, g=-1, b=-1):
        if r == -1:
            return self._color
        elif type(r) == str:
            self._color = r
        else:
            self._color = 'rgb(' + str(r) + ', ' + str(g) + ', ' + str(b) + ')'
        self._update_turtle()

    def fillcolor(self, r=-1, g=-1, b=-1):
        if r == -1:
            return self._fill_color
        elif type(r) == str:
            self._fill_color = r
        else:
            self._fill_color = 'rgb(' + str(r) + ', ' + \
                str(g) + ', ' + str(b) + ')'
        self._update_turtle()

    def pensize(self, width=None):
        if width == None:
            return self._pen_size
        self._pen_size = width

    def _update_turtle(self):
        self._push_command({
            "type": "updateTurtle",
        })

    def write(self, text, move=False, align='left', font=("Arial", 8, "normal")):
        self._push_command({
            "type": "write",
            "text": text,
            "align": align,
            "font": font,
        })

    def dot(self, size=None, color=None):
        if size is None:
            if self._pen_size < 4:
                size = self._pen_size + 4
            else:
                size = self._pen_size * 2
        self._push_command({
            "type": "dot",
            "size": size,
            "dotColor": color,
        })

    def circle(self, radius, extent=None):
        if extent is None:
            extent = 360
        self._push_command({
            "type": "circle",
            "radius": radius,
            "extent": extent,
        })
        # 更新结束时的朝向和位置
        start = self._turtle_heading - 90
        centerX = self._turtle_location_x + radius * \
            math.cos(math.radians(start + 180))
        centerY = self._turtle_location_y + radius * \
            math.sin(math.radians(start + 180))
        nextX = centerX + radius * math.cos(math.radians(extent + start))
        nextY = centerY + radius * math.sin(math.radians(extent + start))
        nextHeading = start + extent + 90
        self._turtle_location_x = nextX
        self._turtle_location_y = nextY
        self._turtle_heading = nextHeading

    def spiral_circle(self, steps, start_radius, radius_stride, angle_stride):
        self._push_command({
            "type": "spiralCircle",
            "steps": steps,
            "startRadius": start_radius,
            "radiusStride": radius_stride,
            "angleStride": angle_stride,
        })
        # 更新螺旋结束时的朝向和位置
        nextX = self._turtle_location_x
        nextY = self._turtle_location_y
        nextHeading = self._turtle_heading
        for i in range(steps):
            radius = start_radius + i * radius_stride
            start = nextHeading - 90
            centerX = nextX + radius * math.cos(math.radians(start + 180))
            centerY = nextY + radius * math.sin(math.radians(start + 180))
            nextX = centerX + radius * \
                math.cos(math.radians(angle_stride + start))
            nextY = centerY + radius * \
                math.sin(math.radians(angle_stride + start))
            nextHeading += angle_stride
        self._turtle_location_x = round(nextX, 10)
        self._turtle_location_y = round(nextY, 10)
        self._turtle_heading = nextHeading % 360

    def spiral_forward(self, steps, start_arc_length, arc_length_stride, angle_stride):
        self._push_command({
            "type": "spiralForward",
            "steps": steps,
            "startArcLength": start_arc_length,
            "arcLengthStride": arc_length_stride,
            "angleStride": angle_stride,
        })
        # 更新螺旋结束时的朝向和位置
        # 模拟forward和left
        nextX = self._turtle_location_x
        nextY = self._turtle_location_y
        nextHeading = self._turtle_heading
        for i in range(steps):
            # forward
            distance = start_arc_length + i * arc_length_stride
            _turtle_heading_x = math.cos(math.radians(nextHeading))
            _turtle_heading_y = math.sin(math.radians(nextHeading))
            nextX += _turtle_heading_x * distance
            nextY += _turtle_heading_y * distance
            # left
            nextHeading += angle_stride
        self._turtle_location_x = round(nextX, 10)
        self._turtle_location_y = round(nextY, 10)
        self._turtle_heading = nextHeading % 360
