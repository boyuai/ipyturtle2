#!/usr/bin/env python
# coding: utf-8

# Copyright (c) wangsijie.
# Distributed under the terms of the Modified BSD License.

"""
TODO: Add module docstring
"""

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

    is_canvas_fixed = Bool(True).tag(sync=True)
    canvas_width = Int(320).tag(sync=True)
    canvas_height = Int(320).tag(sync=True)
    is_turtle_on = Bool(True).tag(sync=True)
    is_pen_on = True

    turtle_height = Int(20).tag(sync=True)
    turtle_width = Int(10).tag(sync=True)
    turtle_location_x = Float(0.0).tag(sync=True)
    turtle_location_y = Float(0.0).tag(sync=True)
    turtle_heading = Float(00.0).tag(sync=True)
    turtle_heading_x = Float(1).tag(sync=True)
    turtle_heading_y = Float(0).tag(sync=True)

    commands = Any([]).tag(sync=True)
    color = Unicode('black').tag(sync=True)
    pen_size = Int(1).tag(sync=True)

    _command_id = 0

    def __init__(self, width=320, height=320, fixed=True):
        DOMWidget.__init__(self)
        self.canvas_width = width
        self.canvas_height = height
        self.canvas_fixed = fixed
        self._reset()

    def _reset(self):
        self.is_turtle_on = True
        self.is_pen_on = True
        self.turtle_location_x = 0
        self.turtle_location_y = 0
        self.turtle_heading = 90.0
        self.turtle_heading_x = 0.0
        self.turtle_heading_y = 1.0
        self.color = 'black'

    def _incr_id(self):
        self._command_id += 1
        return self._command_id

    def position(self):
        return self.turtle_location_x, self.turtle_location_y

    def penup(self):
        self.is_pen_on = False

    def pendown(self):
        self.is_pen_on = True
    
    def forward(self, distance):
        start_x = self.turtle_location_x
        start_y = self.turtle_location_y
        self.turtle_location_x += self.turtle_heading_x * distance
        self.turtle_location_y += self.turtle_heading_y * distance
        if self.is_pen_on:
            self.commands = self.commands + [{
                "type": "line",
                "x": start_x,
                "y": start_y,
                "dx": self.turtle_location_x,
                "dy": self.turtle_location_y,
                "color": self.color,
                "id": self._incr_id(),
                "lineWidth": self.pen_size,
            }]

    def back(self, distance):
        self.forward(-distance)
    
    def heading(self):
        return self.turtle_heading
    
    def goto(self, x, y = None):
        if y is None:
            y = x[1]
            x = x[0]
        self.turtle_location_x = float(x)
        self.turtle_location_y = float(y)
        self._update_turtle()
    
    def setpos(self, x, y = None):
        return self.goto(x, y)

    def setposition(self, x, y = None):
        return self.goto(x, y)

    def left(self, degree=None):
        if degree is None:
            degree = 90
        self.turtle_heading += degree
        self.turtle_heading = self.turtle_heading % 360

        hx = math.cos(math.radians(self.turtle_heading))
        hy = math.sin(math.radians(self.turtle_heading))

        self.turtle_heading_x = hx
        self.turtle_heading_y = hy
        self._update_turtle()

    def right(self, degree=None):
        if degree is None:
            degree = 90
        self.left(-degree)

    def isdown(self):
        return self.is_pen_on

    def hideturtle(self):
        self.is_turtle_on = False
        self._update_turtle()

    def showturtle(self):
        self.is_turtle_on = True
        self._update_turtle()

    def isvisible(self):
        return self.is_turtle_on

    def reset(self):
        self._reset()
        self.commands = self.commands + [{
            "type": "clear",
            "id": self._incr_id(),
        }]

    def pencolor(self,r = -1, g = -1, b = -1):
        if r == -1:
            return self.color
        elif type(r) == str:
            self.color = r
        else:
            self.color = 'rgb(' + str(r) + ', ' + str(g) + ', ' + str(b) + ')'
        self._update_turtle()

    def pensize(self, width=None):
        if width == None:
            return self.pen_size
        self.pen_size = width
    
    def _update_turtle(self):
        self.commands = self.commands + [{
            "type": "updateTurtle",
            "id": self._incr_id(),
        }]

    def write(self, text, move=False, align='left', font=("Arial", 8, "normal")):
        self.commands = self.commands + [{
            "type": "write",
            "id": self._incr_id(),
            "text": text,
            "align": align,
            "font": font,
            "x": self.turtle_location_x,
            "y": self.turtle_location_y,
            "color": self.color,
        }]
    
    def dot(self, size=None, color=None):
        if size is None:
            if self.pen_size < 4:
                size = self.pen_size + 4
            else:
                size = self.pen_size * 2
        if color is None:
            color = self.color
        self.commands = self.commands + [{
            "type": "dot",
            "id": self._incr_id(),
            "size": size,
            "x": self.turtle_location_x,
            "y": self.turtle_location_y,
            "color": color,
        }]

    def circle(self, radius, extent=None):
        if extent is None:
            extent = 360
        self.commands = self.commands + [{
            "type": "circle",
            "id": self._incr_id(),
            "radius": radius,
            "color": self.color,
            "x": self.turtle_location_x,
            "y": self.turtle_location_y,
            "extent": extent,
            "lineWidth": self.pen_size,
        }]