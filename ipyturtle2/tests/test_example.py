#!/usr/bin/env python
# coding: utf-8

# Copyright (c) wangsijie.
# Distributed under the terms of the Modified BSD License.

import pytest

from ..example import TurtleWidget


def test_example_creation_blank():
    w = TurtleWidget()
    assert w.canvas_fixed == True
